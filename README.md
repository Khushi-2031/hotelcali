# Hotel Cali

Floor 4's shared hostel management app: front desk requests, guest register,
plans and moods, Blinkit runs, Settle Up (Splitwise-style expense splitting),
mess hours, water log and chhota runs, wake-up calls, repairs, a speaker queue,
postcard photo and video uploads, the SPC desk, feedback and admin alerts.
Built with React + Vite, backed by Supabase, with push notifications via OneSignal.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open **SQL Editor** → **New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates every
   table the app needs and opens them up to anyone holding your anon key.
3. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon public key**.

> This schema uses permissive row-level-security policies (`using (true)`)
> because the whole floor shares one anon key. That's fine for a private,
> trusted group — don't reuse this schema for anything with untrusted users.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

## 3. Deploy on Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel, **Add New Project** → import the repo. Vercel auto-detects Vite.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every future push to `main` redeploys automatically.

## Project structure

```
hotel-cali/
├─ supabase/schema.sql        # run this once in the Supabase SQL editor
├─ src/
│  ├─ data/roster.js          # floor roster, duty types, meal windows
│  ├─ api.js                  # generic Supabase read/write helpers
│  ├─ supabaseClient.js
│  ├─ App.jsx                 # sidebar + section switcher
│  └─ components/             # one file per feature screen
├─ vercel.json
└─ .env.example
```

## Setup for the new features (do this once, before merging)

Step-by-step guide: **[SETUP.md](./SETUP.md)**. It covers the SQL, the
OneSignal API key, the edge function and its secrets, the webhooks, and
testing.
