const bcrypt = require('bcryptjs');
const supabase = require('./_supabase');

module.exports = async (req, res) => {
  // CORS (safe to leave open since this is same-origin on Vercel; kept simple)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if the email is already registered
    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (lookupErr) {
      console.error(lookupErr);
      return res.status(500).json({ error: 'Server error checking existing account.' });
    }
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: created, error: insertErr } = await supabase
      .from('users')
      .insert([{ name: String(name).trim(), email: normalizedEmail, password_hash: passwordHash }])
      .select('id, name, email')
      .single();

    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: 'Server error creating account.' });
    }

    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: created.id, name: created.name, email: created.email }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
