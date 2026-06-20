# NEXUS — Real Login & Registration (Node.js + Express + Supabase + Vercel)

This replaces the old hardcoded `demo@nexus.sim / password123` login with a
real account system. Anyone can now **create an account** with their own
name, email and password, and the simulator's avatar card (previously
hardcoded as `AGENT_25`) will show their **actual registered name**.

## What changed

- **`public/login.html`** — now has a working *Create Account* / *Log In*
  toggle. It calls your backend (`/api/register`, `/api/login`) instead of
  checking a hardcoded email/password.
- **`public/nexus-mobile-fixed.html`** — on load, reads the logged-in user
  from the browser session and replaces `AGENT_25` with their real name.
  Also adds a small "Log In / Log Out" control to the top nav.
- **`api/register.js`**, **`api/login.js`** — serverless functions (work on
  Vercel as-is, and also locally via `server.js`) that talk to Supabase.
- **`supabase-schema.sql`** — the one-time SQL to create the `users` table.

Passwords are never stored in plain text — they're hashed with `bcrypt`
before being saved.

---

## 1. Set up Supabase (free)

1. Go to https://supabase.com → sign up / log in → **New Project** (free tier).
2. Once it's created, open **SQL Editor** → **New query**, paste the contents
   of `supabase-schema.sql`, and click **Run**. This creates the `users` table.
3. Go to **Project Settings → API**. You'll need two values from here:
   - **Project URL** → this is your `SUPABASE_URL`
   - **`service_role` secret key** (NOT the `anon` key) → this is your
     `SUPABASE_SERVICE_KEY`

   ⚠️ The service role key is powerful — never put it in frontend code or
   commit it to a public repo. It only goes into your server's environment
   variables.

## 2. Run it locally (optional, to test before deploying)

```bash
cd nexus-app
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
JWT_SECRET=any-long-random-string
```

Then:
```bash
npm run dev
```

Visit `http://localhost:3000/login.html`, click **Create Account →**, fill
in your name/email/password, submit. You'll be logged in and redirected to
the simulator, which will now show your real name instead of `AGENT_25`.

## 3. Deploy to Vercel (free)

1. Push this `nexus-app` folder to a GitHub repo (or use the Vercel CLI
   directly — see below).
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. In the import screen, open **Environment Variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   (same values as your local `.env`)
4. Click **Deploy**.

Vercel will automatically detect the `api/` folder as serverless functions
and serve everything in `public/` as static files — no extra config needed
beyond the included `vercel.json`.

**Alternative: deploy via CLI**
```bash
npm i -g vercel
cd nexus-app
vercel          # follow prompts, link/create project
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel --prod
```

Once deployed, your live URLs will look like:
- `https://your-project.vercel.app/login.html`
- `https://your-project.vercel.app/nexus-mobile-fixed.html`
- `https://your-project.vercel.app/effect.html`

## 4. How the name actually gets onto the main page

1. User signs up or logs in on `login.html`.
2. On success, the backend returns `{ token, user: { id, name, email } }`.
3. The frontend saves this in the browser via
   `localStorage.setItem('nexus_user', JSON.stringify(user))`.
4. `nexus-mobile-fixed.html` reads `nexus_user` on page load and sets the
   avatar name (`#av-name`) to that person's real name — and keeps using it
   every time the simulation re-renders, instead of resetting back to
   `AGENT_25`.

## Notes / things you may want to add later

- **Forgot password** is currently just a placeholder toast — wiring up real
  password reset emails would need an email-sending service (e.g. Resend,
  SendGrid) plus a reset-token flow.
- **Sessions** here use a simple JWT stored in `localStorage`. This is fine
  for a personal project/demo. For production-grade security you'd want
  HttpOnly cookies and refresh-token rotation.
- You can view/manage registered users any time in Supabase under
  **Table Editor → users**.
