// /api/habits.js
//
// Vercel Serverless Function — daily habit check-ins (screen time, learning
// hours, fitness, sleep, etc.) so a user can track real-life progress against
// the trajectory their NEXUS simulation projected. Backed by Supabase
// Postgres (free tier). Entirely OPTIONAL — same pattern as scenarios.js.
//
// Table expected in Supabase (see /supabase/schema.sql for the exact DDL):
//
//   create table habit_logs (
//     id          uuid primary key default gen_random_uuid(),
//     owner_id    text not null,
//     log_date    date not null default current_date,
//     metrics     jsonb not null,   -- e.g. { "screen": 4, "learn": 2, "fitness": 1, "sleep": 7 }
//     created_at  timestamptz not null default now(),
//     unique (owner_id, log_date)
//   );
//
// API:
//   GET    /api/habits?ownerId=xxxx&days=30   -> { logs: [...] }   (most recent N days)
//   POST   /api/habits  { ownerId, date, metrics }  -> { log: {...} }  (upsert for that date)
//   DELETE /api/habits?ownerId=xxxx&date=YYYY-MM-DD -> { success: true }

import { getSupabaseClient } from './_supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(501).json({
      error: 'Habit tracking is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel project to enable this feature. The simulator itself works fine without this.',
    });
  }

  try {
    if (req.method === 'GET') {
      const ownerId = (req.query?.ownerId || '').toString().trim();
      const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 30, 1), 365);
      if (!ownerId) return res.status(400).json({ error: 'Missing ownerId query param.' });

      const { data, error } = await supabase
        .from('habit_logs')
        .select('id, log_date, metrics, created_at')
        .eq('owner_id', ownerId)
        .order('log_date', { ascending: false })
        .limit(days);

      if (error) throw error;
      return res.status(200).json({ logs: data || [] });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};

      const ownerId = (body.ownerId || '').toString().trim();
      const date = (body.date || new Date().toISOString().slice(0, 10)).toString().slice(0, 10);
      const metrics = body.metrics;

      if (!ownerId) return res.status(400).json({ error: 'Missing ownerId.' });
      if (!metrics || typeof metrics !== 'object') return res.status(400).json({ error: 'Missing or invalid metrics.' });

      const { data, error } = await supabase
        .from('habit_logs')
        .upsert({ owner_id: ownerId, log_date: date, metrics }, { onConflict: 'owner_id,log_date' })
        .select('id, log_date, metrics, created_at')
        .single();

      if (error) throw error;
      return res.status(200).json({ log: data });
    }

    if (req.method === 'DELETE') {
      const ownerId = (req.query?.ownerId || '').toString().trim();
      const date = (req.query?.date || '').toString().trim();
      if (!ownerId || !date) return res.status(400).json({ error: 'Missing ownerId or date query param.' });

      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('owner_id', ownerId)
        .eq('log_date', date);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Database error: ' + (err?.message || 'unknown error') });
  }
}
