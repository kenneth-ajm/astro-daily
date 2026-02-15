"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

type Profile = {
  dob: string;
  tob: string;
  place: string;
  timezone: string;
};

type Reading = {
  content: string;
  created_at: string;
  // optional if you later fetch it from DB:
  content_json?: StructuredReading | null;
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function moodLabel(score: number) {
  if (score >= 80) return "High clarity";
  if (score >= 60) return "Steady";
  if (score >= 40) return "Wavy";
  return "Low battery";
}

export default function AppClient({
  initialProfile,
  initialReading
}: {
  initialProfile: Profile | null;
  initialReading: Reading | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [dob, setDob] = useState(initialProfile?.dob ?? "");
  const [tob, setTob] = useState(initialProfile?.tob ?? "");
  const [place, setPlace] = useState(initialProfile?.place ?? "");
  const [timezone, setTimezone] = useState(initialProfile?.timezone ?? "");

  // We support both old + new reading formats
  const [readingText, setReadingText] = useState(initialReading?.content ?? "");
  const [readingJson, setReadingJson] = useState<StructuredReading | null>(
    initialReading?.content_json ?? null
  );

  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const mood = useMemo(() => {
    if (!readingJson) return null;
    const score = clamp(Number(readingJson.mood_score ?? 0), 0, 100);
    return { score, label: moodLabel(score) };
  }, [readingJson]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be signed in.");
      setSaving(false);
      return;
    }

    // insert is fine for now, but upsert is nicer (prevents duplicates)
    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      dob,
      tob,
      place,
      timezone
    });

    setSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Birth profile saved.");
    router.refresh();
  };

  const generateReading = async () => {
  setGenerating(true);
  setStatus("");

  const response = await fetch("/api/generate", { method: "POST" });
  const result = await response.json();

  setGenerating(false);

  if (!response.ok) {
    setStatus(result.error ?? "Unable to generate reading.");
    return;
  }

  setReading(result.reading);
  setStatus("New reading generated.");
  router.refresh();
};
