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
  chineseYearElement
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
    rising_sign: string | null; // only when lat/lon available (future)
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
  mood_score: number; // 0-100
  themes: string[];
  do: string;
  avoid: string;
  lucky: { color: string; number: number; time_window: string };
  blueprint: string[];
  transits_today: string[];
  reflection_question: string;
  affirmation: string;
};

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

    // Pull latest profile for this user
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

    const utcBirth = toUtcDate(profile.dob, profile.tob, profile.timezone);
    const birthYear = new Date(profile.dob).getFullYear();
    const birthMonth = new Date(profile.dob).getMonth() + 1;
    const birthDay = new Date(profile.dob).getDate();

    const sun = westernSunSign(birthMonth, birthDay);
    const moon = westernMoonSign(utcBirth);

    const animal = chineseZodiacAnimal(birthYear);
    const elem = chineseYearElement(birthYear);

    // Rising sign requires lat/lon. If missing, we do NOT guess.
    const rising: string | null =
      typeof profile.birth_lat === "number" && typeof profile.birth_lon === "number"
        ? null // placeholder: implement later with true ascendant math
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

    // IMPORTANT: AI is only allowed to interpret, not invent facts.
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a modern astrologer + practical coach. Return ONLY valid JSON. Do not invent zodiac signs. Use the provided facts exactly.",
        },
        {
          role: "user",
          content: `
FACTS (do not change these):
${JSON.stringify(facts)}

Return STRICT JSON matching this schema exactly:

{
  "facts": <exact same facts object above>,
  "headline": string,
  "mood_score": number,
  "themes": string[],
  "do": string,
  "avoid": string,
  "lucky": { "color": string, "number": number, "time_window": string },
  "blueprint": string[],
  "transits_today": string[],
  "reflection_question": string,
  "affirmation": string
}

Rules:
- mood_score: integer 0-100
- themes: 3-5 short labels
- blueprint: exactly 4 bullets, <= 12 words each
- transits_today: exactly 3 bullets, <= 12 words each
- No clichés like "celestial energies".
- Output must be JSON only.
`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const readingJson = JSON.parse(raw) as StructuredReading;

    // Force facts to match our calculated facts (extra safety)
    readingJson.facts = facts;

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
