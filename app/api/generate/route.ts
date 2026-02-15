import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";
import { env } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof cookies>["set"]>[2];
};

type StructuredReading = {
  headline: string;
  mood_score: number; // 0-100
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const openai = new OpenAI({ apiKey: env.openAiApiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a modern astrologer + practical coach. Return ONLY valid JSON. No markdown. No headings. No filler. Avoid clichés like 'celestial energies'. Be specific and contemporary.",
        },
        {
          role: "user",
          content: `Return STRICT JSON that matches this schema exactly:

{
  "headline": string,
  "mood_score": number,
  "themes": string[],
  "do": string,
  "avoid": string,
  "lucky": { "color": string, "number": number, "time_window": string },
  "blueprint": string[],
  "chinese_zodiac": { "animal": string, "traits": string[], "today_tip": string },
  "transits_today": string[],
  "reflection_question": string,
  "affirmation": string
}

Rules:
- mood_score: integer 0-100
- themes: 3-5 short labels (1-2 words each)
- blueprint: exactly 4 bullets, each <= 12 words
- transits_today: exactly 3 bullets, each <= 12 words
- do/avoid: single sentence each, concrete action
- lucky.time_window: like "3–5pm"
- Keep it helpful, not mystical.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let readingJson: StructuredReading;
    try {
      readingJson = JSON.parse(raw) as StructuredReading;
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON" },
        { status: 500 }
      );
    }

    const headline = readingJson.headline ?? "Your day, in one line.";
    const doText = readingJson.do ?? "";
    const summary = `${headline}\nDo: ${doText}`;

    // Overwrite today's reading if it already exists
    await supabase.from("readings").upsert(
      {
        user_id: user.id,
        reading_date: today,
        content: summary,
        content_json: readingJson,
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
