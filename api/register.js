const bcrypt = require('bcryptjs');
const supabase = require('./_supabase');

// Helper: parse JSON body for Vercel serverless (req.body may be undefined)
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const { name, email, password } = await parseBody(req);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (lookupErr) {
      console.error('[register] lookup error:', lookupErr);
      return res.status(500).json({ error: 'Server error checking existing account.' });
    }
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const { data: created, error: insertErr } = await supabase
      .from('users')
      .insert([{ name: String(name).trim(), email: normalizedEmail, password_hash: passwordHash }])
      .select('id, name, email')
      .single();

    if (insertErr) {
      console.error('[register] insert error:', insertErr);
      return res.status(500).json({ error: 'Server error creating account.' });
    }

    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: created.id, name: created.name, email: created.email }
    });
  } catch (err) {
    console.error('[register] unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
