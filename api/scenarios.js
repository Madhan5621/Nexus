// /api/scenarios.js
//
// Vercel Serverless Function — save / load NEXUS simulation "scenarios"
// (the slider inputs + computed results a user wants to come back to later).
// Backed by Supabase Postgres (free tier). Entirely OPTIONAL — the app works
// fully without this; it only activates if SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set in your Vercel environment variables.
//
// Table expected in Supabase (see /supabase/schema.sql for the exact DDL):
//
//   create table scenarios (
//     id          uuid primary key default gen_random_uuid(),
//     owner_id    text not null,            -- free-text client id (see README) or a real auth.uid()
//     name        text not null default 'Untitled scenario',
//     payload     jsonb not null,           -- slider inputs + compute() result snapshot
//     created_at  timestamptz not null default now()
//   );
//
// API:
//   GET  /api/scenarios?ownerId=xxxx        -> { scenarios: [...] }
//   POST /api/scenarios   { ownerId, name, payload }   -> { scenario: {...} }
//   DELETE /api/scenarios?id=xxxx&ownerId=xxxx          -> { success: true }
//
// "ownerId" is a free, anonymous per-browser identifier generated client-side
// (see dashboard.html — localStorage `nexus_owner_id`), NOT a real login.
// This keeps the whole stack at $0 with zero auth infrastructure required.
// If you later add real auth (Supabase Auth, Clerk, etc.), swap ownerId for
// the verified user id server-side.

import { getSupabaseClient } from './_supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(501).json({
      error: 'Scenario persistence is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel project to enable saving scenarios. The simulator itself works fine without this.',
    });
  }

  try {
    if (req.method === 'GET') {
      const ownerId = (req.query?.ownerId || '').toString().trim();
      if (!ownerId) return res.status(400).json({ error: 'Missing ownerId query param.' });

      const { data, error } = await supabase
        .from('scenarios')
        .select('id, name, payload, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.status(200).json({ scenarios: data || [] });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};

      const ownerId = (body.ownerId || '').toString().trim();
      const name = (body.name || 'Untitled scenario').toString().slice(0, 120);
      const payload = body.payload;

      if (!ownerId) return res.status(400).json({ error: 'Missing ownerId.' });
      if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Missing or invalid payload.' });

      const { data, error } = await supabase
        .from('scenarios')
        .insert({ owner_id: ownerId, name, payload })
        .select('id, name, payload, created_at')
        .single();

      if (error) throw error;
      return res.status(201).json({ scenario: data });
    }

    if (req.method === 'DELETE') {
      const ownerId = (req.query?.ownerId || '').toString().trim();
      const id = (req.query?.id || '').toString().trim();
      if (!ownerId || !id) return res.status(400).json({ error: 'Missing id or ownerId query param.' });

      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id)
        .eq('owner_id', ownerId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Database error: ' + (err?.message || 'unknown error') });
  }
}
