"use client";

import { FormEvent, useState } from "react";
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
};

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
  const [reading, setReading] = useState(initialReading?.content ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Astrology Dashboard</h1>
        <button className="rounded border border-slate-700 px-3 py-2 text-sm" onClick={logout}>
          Sign out
        </button>
      </div>

      <form onSubmit={saveProfile} className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Date of birth</span>
          <input
            type="date"
            required
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Time of birth</span>
          <input
            type="time"
            required
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={tob}
            onChange={(e) => setTob(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>Place of birth</span>
          <input
            type="text"
            required
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="City, Country"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>Timezone</span>
          <input
            type="text"
            required
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="e.g. America/New_York"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>
        <button className="rounded bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500 md:col-span-2" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <button
          className="rounded bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-60"
          onClick={generateReading}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate today’s reading"}
        </button>
        {status ? <p className="text-sm text-slate-300">{status}</p> : null}
        {reading ? (
          <article className="rounded border border-slate-700 bg-slate-950 p-4 whitespace-pre-line">{reading}</article>
        ) : (
          <p className="text-slate-400">No reading yet. Save your profile and generate one.</p>
        )}
      </div>
    </section>
  );
}
