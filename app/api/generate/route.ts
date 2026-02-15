import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { env } from "@/lib/env";

export async function POST() {
  try {
    if (!env.openAiApiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dob,tob,place,timezone")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Please save your birth profile first." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: env.openAiApiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an astrology guide. Return a daily reading under 180 words in plain text with exactly three sections titled: Insight, Action, Reflection Question."
        },
        {
          role: "user",
          content: `Birth details:\n- Date: ${profile.dob}\n- Time: ${profile.tob}\n- Place: ${profile.place}\n- Timezone: ${profile.timezone}\nGenerate today's reading.`
        }
      ],
      temperature: 0.8,
      max_tokens: 240
    });

    const reading = completion.choices[0]?.message?.content?.trim();

    if (!reading) {
      return NextResponse.json({ error: "OpenAI returned an empty reading." }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("readings").insert({
      user_id: user.id,
      content: reading
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ reading });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
