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

type Reading = {
  content: string;
  created_at: string;
  content_json?: StructuredReading | null;
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

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("You must be signed in.");
        return;
      }

      // Upsert prevents duplicate rows for the same user_id
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, dob, tob, place, timezone },
          { onConflict: "user_id" }
        );

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus("Birth profile saved.");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save profile.";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const generateReading = async () => {
    setGenerating(true);
    setStatus("");

    try {
      const response = await fetch("/api/generate", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result?.error ?? "Unable to generate reading.");
        return;
      }

      // NEW format
      if (result?.reading_json) {
        setReadingJson(result.reading_json as StructuredReading);
        setReadingText(result?.reading_text ?? "");
        setStatus("New structured reading generated.");
      }
      // OLD format fallback
      else if (result?.reading) {
        setReadingJson(null);
        setReadingText(String(result.reading));
        setStatus("New reading generated.");
      } else {
        setStatus("Generated, but response format was unexpected.");
      }

      router.refresh();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Unexpected error generating reading.";
      setStatus(msg);
    } finally {
      setGenerating(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Astrology Dashboard
          </h1>
          <p className="text-sm text-slate-400">Midnight Observatory ✨</p>
        </div>

        <button
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          onClick={logout}
        >
          Sign out
        </button>
      </div>

      {/* Profile form */}
      <form
        onSubmit={saveProfile}
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur md:grid-cols-2"
      >
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Date of birth</span>
          <input
            type="date"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Time of birth</span>
          <input
            type="time"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={tob}
            onChange={(e) => setTob(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-slate-300">Place of birth</span>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="City, Country"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-slate-300">Timezone</span>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="e.g. Asia/Singapore"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>

        <button
          className="rounded-lg bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500 disabled:opacity-60 md:col-span-2"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      {/* Reading area */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-60"
            onClick={generateReading}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate today’s reading"}
          </button>

          {mood ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <div className="text-xs text-slate-400">Mood</div>
              <div className="h-2 w-40 overflow-hidden rounded bg-slate-800">
                <div
                  className="h-2 bg-violet-500"
                  style={{ width: `${mood.score}%` }}
                />
              </div>
              <div className="text-sm font-medium text-slate-100">
                {mood.score}
              </div>
              <div className="text-xs text-slate-400">{mood.label}</div>
            </div>
          ) : null}
        </div>

        {status ? <p className="text-sm text-slate-300">{status}</p> : null}

        {/* Structured dashboard */}
        {readingJson ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-xl font-semibold text-slate-50">
                {readingJson.headline}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {(readingJson.themes ?? []).slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-emerald-400">
                  Do
                </div>
                <p className="mt-2 text-slate-200">{readingJson.do}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-rose-400">
                  Avoid
                </div>
                <p className="mt-2 text-slate-200">{readingJson.avoid}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Lucky
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Color</div>
                  <div className="mt-1 text-lg font-semibold text-slate-50">
                    {readingJson.lucky?.color}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Number</div>
                  <div className="mt-1 text-lg font-semibold text-slate-50">
                    {readingJson.lucky?.number}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="text-xs text-slate-400">Time window</div>
                  <div className="mt-1 text-lg font-semibold text-slate-50">
                    {readingJson.lucky?.time_window}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Your blueprint
                </div>
                <ul className="mt-3 space-y-2 text-slate-200">
                  {(readingJson.blueprint ?? []).slice(0, 6).map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-500">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Chinese zodiac
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-50">
                  {readingJson.chinese_zodiac?.animal}
                </div>

                <ul className="mt-3 space-y-2 text-slate-200">
                  {(readingJson.chinese_zodiac?.traits ?? [])
                    .slice(0, 5)
                    .map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                </ul>

                {readingJson.chinese_zodiac?.today_tip ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-xs text-slate-400">Today’s tip</div>
                    <div className="mt-1 text-slate-200">
                      {readingJson.chinese_zodiac.today_tip}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Today’s sky
              </div>
              <ul className="mt-3 space-y-2 text-slate-200">
                {(readingJson.transits_today ?? []).slice(0, 6).map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Reflection
                </div>
                <p className="mt-2 text-slate-200">
                  {readingJson.reflection_question}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Affirmation
                </div>
                <p className="mt-2 text-slate-200">{readingJson.affirmation}</p>
              </div>
            </div>
          </div>
        ) : readingText ? (
          <article className="whitespace-pre-line rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100">
            {readingText}
          </article>
        ) : (
          <p className="text-slate-400">No reading yet. Save your profile and generate one.</p>
        )}
      </div>
    </section>
  );
}
