const { createClient } = require('@supabase/supabase-js');

// SUPABASE_URL and SUPABASE_SERVICE_KEY are set as Environment Variables
// in Vercel (Project Settings → Environment Variables), never committed to code.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
