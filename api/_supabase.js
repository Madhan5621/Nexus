// /api/_supabase.js
//
// Shared helper for creating a server-side Supabase client inside Vercel
// serverless functions. Not a route itself — imported by scenarios.js and
// habits.js. (The underscore prefix keeps Vercel from treating it as its
// own API route.)
//
// Uses the SUPABASE_SERVICE_ROLE_KEY (server-only secret) rather than the
// public anon key, so these functions can bypass Row Level Security when
// needed (e.g. writing on behalf of a verified user id). Keep this key out
// of the frontend entirely — it must only ever live in Vercel's environment
// variables.
//
// Free-tier note: Supabase's free project tier includes a hosted Postgres
// database, auth, and API at $0/month (with pause-after-inactivity on the
// free plan — just open the project dashboard to resume it).

import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null; // caller must handle this and return a clear error to the client
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
