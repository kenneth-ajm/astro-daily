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
  const mood_score = Number.isFinite(mood) ? Math.max(0, Math.min(100, Math.round(mood))) : 60;

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
    // Deterministic override: always use calculated animal
    animal: facts.chinese.animal,
    traits: Array.isArray(cz.traits) ? cz.traits.map(String).filter(Boolean).slice(0, 5) : [],
    today_tip: String(cz.today_tip ?? ""),
  };

  return {
    facts, // deterministic facts
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
      return NextResponse.json(
        { error: "Save your birth profile first." },
        { status: 400 }
      );
    }

    // Compute deterministic facts
    const utcBirth = toUtcDate(profile.dob, profile.tob, profile.timezone);
    const birthYear = new Date(profile.dob).getFullYear();
    const birthMonth = new Date(profile.dob).getMonth() + 1;
    const birthDay = new Date(profile.dob).getDate();

    const sun = westernSunSign(birthMonth, birthDay);
    const moon = westernMoonSign(utcBirth);

    const animal = chineseZodiacAnimal(birthYear);
    const elem = chineseYearElement(birthYear
::contentReference[oaicite:0]{index=0}
