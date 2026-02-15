import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-violet-300">
          Astro Daily
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-200 hover:text-violet-300">
            Home
          </Link>
          <Link href="/login" className="text-slate-200 hover:text-violet-300">
            Login
          </Link>
          <Link href="/app" className="rounded bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-500">
            App
          </Link>
        </div>
      </nav>
    </header>
  );
}
