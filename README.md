# NEXUS — Life Trajectory Simulator

A futuristic, glassmorphism-styled web app that simulates personal financial / life
trajectories using compounding-growth math, live economic data (inflation, FX rates),
Monte Carlo projections, and now a **real AI Advisor powered by Claude**.

The frontend is **100% static** (plain HTML/CSS/JS, no build step). The new AI Advisor,
scenario-saving, and habit-tracking features are powered by **Vercel Serverless
Functions** — small Node.js files in `/api` that Vercel auto-detects with zero config.
Everything in this repo can run at **$0/month** on free tiers (details on exact limits
in section 5).

---

## 1. Tech stack

| Layer | Tech |
|---|---|
| Markup / styling | HTML5, CSS3 (custom properties, glassmorphism cards, CSS animations) |
| Frontend logic | Vanilla JavaScript (ES6+), Canvas API (particle background, sparklines, radar charts) |
| 3D | [Three.js r128](https://threejs.org/) (CDN) — animated avatar |
| Fonts | Google Fonts — Orbitron, Sora, JetBrains Mono (CDN) |
| Live data | [open.er-api.com](https://www.exchangerate-api.com/) (FX rates) and [World Bank API](https://data.worldbank.org/) (CPI/inflation) — both free, public, no key needed |
| **AI Advisor backend** | **Vercel Serverless Function** (`/api/advisor.js`, Node.js, no framework) proxying the **Anthropic Claude API** |
| **Optional persistence** | **Vercel Serverless Functions** (`/api/scenarios.js`, `/api/habits.js`) + **Supabase** (free hosted Postgres) |
| Hosting | **Vercel** (free Hobby tier) |

This stack was chosen specifically for Vercel's free tier: vanilla JS frontend +
Node.js serverless functions need **zero extra framework**, deploy from the same repo
as the static site, and avoid any service that requires an always-on server process
(which the free tier doesn't support).

---

## 2. Project structure

```
nexus-life-trajectory-simulator/
├── index.html              # Entry / boot sequence ("NEXUS · Entry Sequence")
├── login.html               # Login / identity verification screen (demo auth)
├── dashboard.html            # Main app — Advanced Life Trajectory Simulator v6.0
│                              #   + new AI Advisor panel + Save Scenario button
├── api/
│   ├── advisor.js            # POST — proxies Claude API calls (hides your API key)
│   ├── scenarios.js          # GET/POST/DELETE — save/load simulation scenarios (Supabase)
│   ├── habits.js             # GET/POST/DELETE — daily habit check-ins (Supabase)
│   └── _supabase.js          # shared server-side Supabase client helper
├── supabase/
│   └── schema.sql            # run once in Supabase SQL editor to enable persistence
├── package.json               # declares @supabase/supabase-js for the API functions
├── vercel.json                 # Vercel deploy config (static + functions, no build step)
├── netlify.toml                  # static-only fallback config (see note inside the file)
├── .env.example                   # documents required environment variables
├── .gitignore
└── README.md
```

**Flow:** `index.html` (intro animation, click *Enter*) → `login.html` (demo auth) →
`dashboard.html` (the simulator, now with an AI Advisor panel inside the
"AI Prediction Engine" section).

### Demo login
```
Email:    demo@nexus.sim
Password: password123
```
(Hardcoded client-side for demo purposes — see *Notes on the login* in section 7.)

---

## 3. What's new in this version

1. **AI Advisor (Claude-powered)** — inside the "AI Prediction Engine" section on the
   dashboard, there's now a real chat box. Ask a free-text question or tap a quick-ask
   chip ("Biggest lever?", "Career risk?", etc.) and it sends your current simulation
   numbers to `/api/advisor`, which calls the real Anthropic API server-side and
   streams back a short, numbers-aware answer. Your Anthropic API key is **never**
   exposed to the browser.
2. **Save Scenario** — a new header button next to Export PDF / Share Results. Saves
   your current slider inputs + computed results to a Postgres table via
   `/api/scenarios.js`, using a free, anonymous per-browser id (no login required).
   Optional — only activates once you've set up Supabase (section 5.3).
3. **Habit check-in API** (`/api/habits.js`) — a ready-to-use backend endpoint for
   logging daily habits (screen time, learning hours, etc.) against your simulated
   trajectory. Not wired into the dashboard UI yet by design (kept minimal) — call it
   directly from your own widget/cron job, or extend `dashboard.html` to add a UI for
   it later.

If you don't configure any environment variables at all, the app **still works
exactly like before** — the AI Advisor and Save Scenario buttons will just show a
clear "not configured" message instead of erroring silently.

---

## 4. Run it locally

### Static-only (fastest, no functions)
```bash
# Python (preinstalled on macOS/Linux)
python3 -m http.server 5173

# OR Node (no install needed, uses npx)
npx serve . -l 5173
```
Then open `http://localhost:5173`. The AI Advisor / Save Scenario buttons will show a
"not configured" error in this mode since there's no server running `/api/*`.

### Full local dev, including `/api` functions
1. Install the [Vercel CLI](https://vercel.com/docs/cli) (free):
   ```bash
   npm install -g vercel
   ```
2. Copy `.env.example` to `.env.local` and fill in your real keys (see section 5).
3. Run:
   ```bash
   npm install
   vercel dev
   ```
4. Open the local URL it prints (usually `http://localhost:3000`). This runs the
   static pages **and** the `/api` functions exactly as they'll behave in production.

---

## 5. Deploy for free (Vercel)

### 5.1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 5.2 — Import into Vercel
1. Create a free account at [vercel.com](https://vercel.com) (sign in with GitHub —
   no credit card required for the Hobby/free plan).
2. **Add New → Project** → import the GitHub repo you just pushed.
3. Vercel auto-detects this as a static site with serverless functions in `/api` —
   leave the Framework Preset as **Other**, Build Command **empty**, Output
   Directory **`.`** (this matches `vercel.json`, already configured for you).
4. **Before clicking Deploy**, add environment variables (Project → Settings →
   Environment Variables, or during the import wizard):
   - `CLAUDE_API_KEY` → your Anthropic API key (required for the AI Advisor; see 5.4)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` → only if you want Save Scenario /
     habit tracking to work (see 5.3 — optional)
5. Click **Deploy**. You get a free `https://<your-project>.vercel.app` URL with
   automatic HTTPS, a global CDN, and serverless functions — all on Vercel's free
   Hobby tier. Every future `git push` auto-redeploys.

### 5.3 — (Optional) Supabase for Save Scenario / habit tracking
1. Create a free account at [supabase.com](https://supabase.com) and a new project
   (free tier — no card required; note free projects pause after a week of
   inactivity, just open the dashboard to resume them).
2. In your Supabase project: **SQL Editor → New query** → paste the entire contents
   of `supabase/schema.sql` from this repo → **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → set as `SUPABASE_URL` in Vercel
   - **service_role key** (NOT the `anon` key) → set as `SUPABASE_SERVICE_ROLE_KEY`
     in Vercel. This key is secret — it's only ever read inside `/api/*.js` on
     Vercel's servers, never sent to the browser.
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy), or just push any commit — env var
   changes require a redeploy to take effect.

### 5.4 — Getting a Claude API key (for the AI Advisor)
1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys) and
   create an account, then generate an API key.
2. **Hosting stays free regardless** — this key only affects the AI Advisor feature.
   Anthropic bills API usage separately from Vercel/Supabase hosting (per the
   official pricing at [anthropic.com/pricing](https://www.anthropic.com/pricing)).
   The advisor function uses a small, cheap model (`claude-3-5-haiku`) and caps
   responses at 700 tokens per call specifically to keep usage costs minimal if you
   do want to use it.
3. If you never set `CLAUDE_API_KEY`, the AI Advisor button simply shows a clear
   "not configured" message — nothing else in the app is affected, and there is zero
   risk of unexpected charges since no Anthropic calls are ever made without a key.

---

## 6. Cost breakdown — staying at $0

| Service | Free tier covers | What could ever cost money |
|---|---|---|
| **Vercel Hobby plan** | Unlimited static hosting, generous serverless function invocations/compute per month, HTTPS, custom domains | Exceeding Hobby plan limits (very high traffic) or upgrading to Pro |
| **Supabase free project** | Hosted Postgres, ~500MB storage, API requests | Exceeding free-tier storage/bandwidth, or upgrading the project plan |
| **Anthropic API** | New accounts may include limited free trial credit | Any AI Advisor usage beyond included trial credit is billed by Anthropic per token — this is the **only** part of this stack with pay-as-you-go pricing by design, and it's entirely optional |
| **open.er-api.com / World Bank API** | Free, public, keyless, no cost ever | N/A |
| **Google Fonts / Three.js CDN (cdnjs)** | Free, no account | N/A |

**To guarantee $0 forever:** simply don't set `CLAUDE_API_KEY`. The simulator, Save
Scenario UI, and everything else still functions — you only lose the AI Advisor's
ability to actually call Claude (it'll show a friendly error instead).

---

## 7. Notes on the login screen

`login.html` checks credentials with a hardcoded `if` statement in client-side
JavaScript — there is no real authentication or backend, and the "Save Scenario"
feature uses an anonymous per-browser id (`localStorage`), not a real account system.
This is fine for a demo/portfolio piece, but **don't store real sensitive user data or
treat this as secure**. If you want real auth later, free options that pair well with
Vercel + Supabase include **Supabase Auth** (same project you may already have set up
in section 5.3) or **Clerk** — both have generous free tiers and would be a small
additive change.

---

## 8. Extending further

- **Wire up habit tracking in the UI**: `/api/habits.js` is ready to use
  (`GET/POST/DELETE /api/habits`) but intentionally has no dashboard widget yet —
  add a small form/chart in `dashboard.html` that calls it, the same way
  `saveScenario()` calls `/api/scenarios`.
- **Swap the AI model**: edit the `ALLOWED_MODEL` constant at the top of
  `api/advisor.js` if you want a different Claude model.
- **Add real auth**: see section 7.
- **Move off Vercel**: the static pages (`index.html`, `login.html`,
  `dashboard.html`) will run anywhere (GitHub Pages, Netlify, Cloudflare Pages — see
  the comment at the top of `netlify.toml`), but the `/api/*.js` files use Vercel's
  specific serverless-function auto-detection convention and would need to be ported
  to that platform's equivalent (Netlify Functions, Cloudflare Pages Functions, etc.)
  if you switch hosts.

---

## 9. License

This project's code is provided as-is for your own use/deployment.
