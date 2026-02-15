import Link from "next/link";

export default function LandingPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Your Daily Cosmic Compass</h1>
      <p className="max-w-2xl text-slate-300">
        Astro Daily blends your birth details with AI to generate a focused reading each day: one insight,
        one action, and one reflection question.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500">
          Get started
        </Link>
        <Link href="/app" className="rounded border border-slate-700 px-4 py-2 font-medium hover:border-violet-500">
          Open app
        </Link>
      </div>
    </section>
  );
}
