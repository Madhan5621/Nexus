// /api/advisor.js
//
// Vercel Serverless Function — proxies chat requests to the Anthropic API.
// Runs on Vercel's free Hobby tier (Node.js runtime, no extra framework needed).
//
// WHY THIS FILE EXISTS:
// The browser can never be trusted with your real Anthropic API key — anyone
// could open DevTools → Network and steal it. This function holds the key as
// a server-side environment variable (set in the Vercel dashboard, never
// committed to Git) and the frontend calls THIS endpoint instead of
// api.anthropic.com directly.
//
// Frontend usage (already wired up in dashboard.html):
//   const res = await fetch('/api/advisor', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ simulation: {...}, question: '...' })
//   });
//
// Required environment variable (set in Vercel → Project → Settings → Environment Variables):
//   CLAUDE_API_KEY = sk-ant-xxxxxxxx...
//
// Cost note: Vercel hosting + invoking this function is free on the Hobby
// tier (within the generous free-tier request/compute limits). The Anthropic
// API call itself is billed by Anthropic per token — see
// https://www.anthropic.com/pricing. If you want to keep total cost at $0,
// don't add billing to your Anthropic account; the free trial credit (if
// your account has one) will simply stop working once exhausted, and this
// function will return a clear error instead of charging anyone.

const ALLOWED_MODEL = 'claude-3-5-haiku-20241022'; // cheap + fast, good default for this app
const MAX_TOKENS = 700;

function buildSystemPrompt() {
  return `You are the NEXUS AI Advisor, a concise financial/life-trajectory coach embedded in a
life-simulation web app. You are given the user's simulation inputs and computed results as JSON,
plus a question. Respond in under 180 words, in plain text (no markdown headers), with specific,
actionable observations that reference the actual numbers you were given. Be direct and encouraging,
never preachy. Do not give regulated financial, tax, medical, or legal advice — frame guidance as
general, educational scenario analysis, not personalized professional advice.`;
}

function summarizeSimulation(sim) {
  // Defensive extraction — keep the payload small and only pass along
  // numbers/strings, never trust arbitrary nested objects from the client.
  if (!sim || typeof sim !== 'object') return {};
  const pick = (obj, keys) => {
    const out = {};
    for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
  };
  return pick(sim, [
    'age', 'screen', 'learn', 'fitness', 'sleep', 'career', 'income', 'education',
    'savingsRate', 'networking', 'stress', 'riskTolerance', 'retireAge',
    'YEARS', 'nominalInflation', 'fireProgressB', 'fireNumberB',
  ]);
}

export default async function handler(req, res) {
  // CORS / method guard — this endpoint should only ever be called from
  // your own deployed origin via same-site fetch, but we keep this simple
  // and permissive since there's no sensitive per-user data involved.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing CLAUDE_API_KEY. Set it in your Vercel project environment variables and redeploy.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const question = typeof body.question === 'string' && body.question.trim()
    ? body.question.trim().slice(0, 800)
    : 'Give me a short summary of how I could improve my trajectory.';

  const simSummary = summarizeSimulation(body.simulation);

  const userContent = `Simulation snapshot (JSON): ${JSON.stringify(simSummary)}\n\nUser question: ${question}`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ALLOWED_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      // Pass through Anthropic's error message but don't leak the key.
      return res.status(upstream.status).json({
        error: data?.error?.message || 'Upstream Anthropic API error.',
      });
    }

    const text = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      : '';

    return res.status(200).json({ reply: text || 'No response generated.' });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API: ' + (err?.message || 'unknown error') });
  }
}
