import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";
import { env } from "@/lib/env";

export async function POST() {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
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

    const openai = new OpenAI({
      apiKey: env.openAiApiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a modern astrologer. Return ONLY valid JSON. No markdown. No explanations.",
        },
        {
          role: "user",
          content: `
Return JSON with this structure:

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
`,
        },
      ],
    });

    const readingJson = JSON.parse(response.choices[0].message.content || "{}");

    const summary = `${readingJson.headline}\n\nDo: ${readingJson.do}`;

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
}
