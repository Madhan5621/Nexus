-- Run this in Supabase: Dashboard → SQL Editor → New Query → paste & Run

create extension if not exists "uuid-ossp";

create table if not exists users (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text not null unique,
  password_hash text not null,
  created_at  timestamptz not null default now()
);

-- Speeds up login lookups by email
create index if not exists idx_users_email on users (lower(email));

-- Lock the table down: only server-side code using the service_role key
-- (which is what api/login.js and api/register.js use) can read/write it.
-- service_role always bypasses RLS, so this doesn't affect your app —
-- it just blocks the public anon key from ever touching this table directly.
alter table users enable row level security;
