-- supabase/schema.sql
--
-- Optional persistence layer for NEXUS — Life Trajectory Simulator.
-- Run this once in your Supabase project's SQL editor (free tier project).
-- The app works completely fine without this; it only enables:
--   • saving/loading scenarios from the dashboard
--   • daily habit check-in tracking
--
-- How to run it:
--   1. Create a free project at https://supabase.com
--   2. Open Project → SQL Editor → New query
--   3. Paste this entire file and click "Run"
--   4. Copy your Project URL and service_role key (Project Settings → API)
--      into Vercel's environment variables as SUPABASE_URL and
--      SUPABASE_SERVICE_ROLE_KEY (see README.md).

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ── Scenarios: saved slider-input + computed-result snapshots ──
create table if not exists scenarios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,
  name        text not null default 'Untitled scenario',
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists scenarios_owner_id_idx on scenarios (owner_id, created_at desc);

-- ── Habit logs: one row per user per day ──
create table if not exists habit_logs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,
  log_date    date not null default current_date,
  metrics     jsonb not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, log_date)
);

create index if not exists habit_logs_owner_date_idx on habit_logs (owner_id, log_date desc);

-- ── Row Level Security ──
-- These tables are only ever written to via the server-side Vercel functions
-- using the service_role key, which bypasses RLS by design. We still enable
-- RLS and add a deny-by-default policy so the anon/public key (if ever used
-- client-side for reads) can't read or write anything without an explicit
-- policy. This is defense-in-depth, not strictly required for the app to work.

alter table scenarios enable row level security;
alter table habit_logs enable row level security;

-- No policies are created here on purpose — this means the anon key has
-- zero access by default, and only the service_role key (used exclusively
-- inside /api/*.js on the server) can read or write. If you later add real
-- Supabase Auth and want the browser to query directly, add policies like:
--
--   create policy "Users can read own scenarios"
--     on scenarios for select
--     using (auth.uid()::text = owner_id);
