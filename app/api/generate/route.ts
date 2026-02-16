import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";
import { env } from "@/lib/env";
import {
  toUtcDate,
  westernSunSign,
  westernMoonSign,
  chineseZodiacAnimal,
  chineseYearElement,
} from "@/lib/astro";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof cookies>["set"]>[2];
};

type Facts = {
  western: {
    sun_sign: string;
    moon_sign: string;
    rising_sign: string | null;
  };
  chinese: {
    animal: string;
    element: string;
    yin_yang: "Yin" | "Yang";
  };
  birth: {
    dob: string;
    tob: string;
    timezone: string;
    place: string;
    birth_lat: number | null;
    birth_lon: number | null;
  };
};

type StructuredReading = {
  facts: Facts;
  headline: string;
  mood_score: number;
  themes: string[];
  do: string;
  avoid: string;
  lucky: { color: string; number: number; time_window: string };
  blueprint: string[];
  chinese_zodiac: { animal: string; traits: string[]; today_tip: string };
  transits_today: string[];
  reflection_question: string;
  affirmation: string;
};

function normalizeReading(rawObj: unknown, facts: Facts): StructuredReading {
  const obj = (rawObj ?? {}) as Partial<StructuredReading>;

  const mood = Number(obj.mood_score);
  const mood_score = Number.isFinite(mood)
    ? Math.max(0, Math.min(100, Math.round(mood)))
    : 60;

  const themes = Array.isArray(obj.themes) ? obj.themes.map(String).slice(0, 6) : [];

  const luckyObj = (obj.lucky ?? {}) as Partial<StructuredReading["lucky"]>;
  const lucky = {
    color: String(luckyObj.color ?? "Navy"),
    number: Number.isFinite(Number(luckyObj.number)) ? Math.round(Number(luckyObj.number)) : 7,
    time_window: String(luckyObj.time_window ?? "2–4pm"),
  };

  const blueprint = Array.isArray(obj.blueprint)
    ? obj.blueprint.map(String).filter(Boolean).slice(0, 6)
    : [];

  const transits_today = Array.isArray(obj.transits_today)
    ? obj.transits_today.map(String).filter(Boolean).slice(0, 6)
    : [];

  const cz = (obj.chinese_zodiac ?? {}) as Partial<StructuredReading["chinese_zodiac"]>;
  const chinese_zodiac = {
    animal: facts.chinese.animal, // deterministic
    traits: Array.isArray(cz.traits) ? cz.traits.map(String).filter(Boolean).slice(0, 5) : [],
    today_tip: String(cz.today_tip ?? ""),
  };

  return {
    facts,
    headline: String(obj.headline ?? "Today’s focus"),
    mood_score,
    themes,
    do: String(obj.do ?? ""),
    avoid: String(obj.avoid ?? ""),
    lucky,
    blueprint,
    chinese_zodiac,
    transits_today,
    reflection_question: String(obj.reflection_question ?? ""),
    affirmation: String(obj.affirmation ?? ""),
  };
}

export async function POST() {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("dob,tob,place,timezone,birth_lat,birth_lon")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    if (!profile?.dob || !profile?.tob || !profile?.timezone || !profile?.place) {
      return NextResponse.json({ error: "Save your birth profile first." }, { status: 400 });
    }

    // Deterministic facts
    const utcBirth = toUtcDate(profile.dob, profile.tob, profile.timezone);
    const birthYear = new Date(profile.dob).getFullYear();
    const birthMonth = new Date(profile.dob).getMonth() + 1;
    const birthDay = new Date(profile.dob).getDate();

    const sun = westernSunSign(birthMonth, birthDay);
    const moon = westernMoonSign(utcBirth);

    const animal = chineseZodiacAnimal(birthYear);
    const elem = chineseYearElement(birthYear);

    const rising: string | null =
      typeof profile.birth_lat === "number" && typeof profile.birth_lon === "number"
        ? null
        : null;

    const facts: Facts = {
      western: {
        sun_sign: sun,
        moon_sign: moon,
        rising_sign: rising,
      },
      chinese: {
        animal,
        element: elem.element,
        yin_yang: elem.yinYang,
      },
      birth: {
        dob: profile.dob,
        tob: profile.tob,
        timezone: profile.timezone,
        place: profile.place,
        birth_lat: profile.birth_lat ?? null,
        birth_lon: profile.birth_lon ?? null,
      },
    };

    const today = new Date().toISOString().slice(0, 10);

    const openai = new OpenAI({ apiKey: env.openAiApiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a modern astrologer + practical coach. Return ONLY valid JSON. Do not change provided facts. Avoid clichés like 'celestial energies'.",
        },
        {
          role: "user",
          content: `
FACTS (DO NOT CHANGE THESE):
${JSON.stringify(facts)}

Return STRICT JSON matching this schema:

{
  "facts": <exact same facts object above>,
  "headline": string,
  "mood_score": number (0-100),
  "themes": string[],
  "do": string,
  "avoid": string,
  "lucky": { "color": string, "number": number, "time_window": string },
  "blueprint": string[],
  "chinese_zodiac": { "animal": "${facts.chinese.animal}", "traits": string[], "today_tip": string },
  "transits_today": string[],
  "reflection_question": string,
  "affirmation": string
}

Rules:
- mood_score: integer 0-100
- themes: 3-5 short labels
- blueprint: exactly 4 bullets, <= 12 words each
- transits_today: exactly 3 bullets, <= 12 words each
- chinese_zodiac.animal MUST be "${facts.chinese.animal}"
- JSON only.
`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const readingJson = normalizeReading(parsed, facts);

    const summary = `${readingJson.headline}\nDo: ${readingJson.do}`;

    await supabase.from("readings").upsert(
      {
        user_id: user.id,
        reading_date: today,
        content: summary,
        content_json: readingJson,
        facts_json: facts,
      },
      { onConflict: "user_id,reading_date" }
    );

    return NextResponse.json({
      reading_json: readingJson,
      reading_text: summary,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
