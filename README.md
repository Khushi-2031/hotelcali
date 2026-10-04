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

Everything happens in the Supabase dashboard (supabase.com > your Hotel Cali
project). About 10 minutes. Nothing here deletes data.

### Step 1: Create the new tables (SQL Editor)
1. Left sidebar > **SQL Editor** > **+ New query**.
2. Open [`supabase/migrations/002_pings_tab_uploads.sql`](./supabase/migrations/002_pings_tab_uploads.sql),
   click **Raw**, select all, copy.
3. Paste into the query box and click **Run** (bottom right).
4. You should see "Success. No rows returned".
5. Check: **Table Editor** now lists `pings`, `front_desk_requests`,
   `chhota_runs`, `expenses`, `settlements`, `spc_broadcasts`. **Storage**
   shows a bucket called `postcards`.

### Step 2: Update the notification function (Edge Functions)
1. Left sidebar > **Edge Functions** > click **notify-critical**.
2. Open the **Code** tab.
3. Delete everything in `index.ts` and paste the contents of
   [`supabase/functions/notify-critical/index.ts`](./supabase/functions/notify-critical/index.ts) (Raw, copy all).
4. Click **Deploy** (or **Deploy updates**).
5. Still in Edge Functions, open **Secrets** and confirm `ONESIGNAL_APP_ID` and
   `ONESIGNAL_REST_API_KEY` are listed. If not, add them from OneSignal >
   Settings > Keys & IDs.

(If you prefer the terminal: `supabase functions deploy notify-critical`.)

### Step 3: Connect the new `pings` table to the function (Webhooks)
1. Left sidebar > **Database** > **Webhooks** (in newer dashboards:
   **Integrations** > **Database Webhooks**). Enable webhooks if asked.
2. Click **Create a new hook** and fill in:
   - Name: `notify-pings`
   - Table: `pings`
   - Events: tick **Insert** only
   - Type of webhook: **Supabase Edge Functions**
   - Edge Function: `notify-critical`, Method: `POST`
   - HTTP Headers: click **Add auth header with service key**
3. Click **Create webhook**.
4. Leave the existing `admin_alerts` webhook as it is. The old
   `wakeup_calls` webhook can stay; it is now ignored.

### Step 4 (optional): Email the admin when a postcard is uploaded
1. Sign up at resend.com (free), go to **API Keys** > **Create API key**, copy it.
2. Supabase > **Edge Functions** > **Secrets** > add:
   - `RESEND_API_KEY` = the key you copied
   - `ADMIN_EMAIL` = the email that should receive postcards (on Resend's
     free plan without a verified domain, this must be the email you signed up with)
3. Create one more webhook exactly like Step 3, but Name `notify-postcards`
   and Table `content_posts`.

### Step 5: Test on the preview link
1. Open the Vercel preview on your phone, pick your name under
   "Who's checking in?" and allow notifications.
2. Have a floormate do the same on theirs.
3. Front Desk > post a request. Their phone should buzz.
4. If nothing arrives: Supabase > **Edge Functions** > notify-critical >
   **Logs** shows the OneSignal response, and OneSignal > **Delivery** shows
   whether it was sent.

After merging, everyone on the floor picks their name once and taps
"Enable notifications on this device" again, so targeted pings can find
their phone.

Uploaded postcards live in a public storage bucket (unguessable file paths),
capped at 50 MB per file.
