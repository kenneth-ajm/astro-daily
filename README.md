# Astro Daily (Next.js + Supabase + OpenAI)

A Next.js App Router TypeScript app that lets users save birth details and generate a daily astrology reading.

## Features

- Tailwind CSS styling
- Pages:
  - `/` landing page
  - `/login` sign in/sign up page
  - `/app` protected dashboard page
- Navigation header across pages
- Birth profile form on `/app` for:
  - date of birth
  - time of birth
  - place of birth
  - timezone
- Saves profile entries to Supabase table `profiles`
- `Generate today’s reading` button calls `POST /api/generate`
- `/api/generate` calls OpenAI and returns a reading under 180 words with:
  1. insight
  2. one action
  3. one reflection question
- Saves generated readings to Supabase table `readings`

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## 3) Create Supabase tables

Run SQL in your Supabase SQL editor:

```sql
create table if not exists public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dob date not null,
  tob time not null,
  place text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.readings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.readings enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
for select using (auth.uid() = user_id);

create policy "Profiles are insertable by owner" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "Readings are viewable by owner" on public.readings
for select using (auth.uid() = user_id);

create policy "Readings are insertable by owner" on public.readings
for insert with check (auth.uid() = user_id);
```

## 4) Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Notes

- `/app` is protected by checking Supabase session server-side and redirecting unauthenticated users to `/login`.
- OpenAI generation is implemented in `app/api/generate/route.ts`.
