# Hotel Cali: setup for notifications and the new features

Do this once, before merging the redesign. About 20 minutes. You need two
browser tabs: **Supabase** (supabase.com, your Hotel Cali project) and
**OneSignal** (onesignal.com, the Hotel Cali app). Nothing here deletes data.

## How the pieces fit (30-second version)

1. Someone taps "Ping" in the app, so the app writes a row into a Supabase
   table called `pings`.
2. A Supabase **webhook** notices the new row and calls an **Edge Function**
   called `notify-critical` (a small piece of code running on Supabase).
3. The function asks **OneSignal** to buzz the right phones. To be allowed to
   do that, it needs your OneSignal **App ID** and an **API key** (stored in
   Supabase as **secrets**).

So you need: tables (Part 1) → a OneSignal key (Part 2) → the function plus
its secrets (Part 3) → webhooks (Part 4) → a test (Part 5).

---

## Part 1: Create the new tables (Supabase)

1. Open supabase.com and open the **Hotel Cali** project. Its address contains
   `lnrfzkqrrnxvfhrikdyk`.
2. Left sidebar: click **SQL Editor** (the `>_` icon).
3. Click **+ New query** (top left). An empty editor opens.
4. In another tab open
   [`supabase/migrations/002_pings_tab_uploads.sql`](./supabase/migrations/002_pings_tab_uploads.sql),
   click **Raw**, press Ctrl/Cmd+A, then Ctrl/Cmd+C.
5. Back in Supabase, paste into the editor and click **Run** (bottom right,
   or Ctrl/Cmd+Enter).
6. You should see **"Success. No rows returned"**.
7. Check: left sidebar **Table Editor** should now list `pings`,
   `front_desk_requests`, `chhota_runs`, `expenses`, `settlements` and
   `spc_broadcasts`. Left sidebar **Storage** should show a bucket called
   `postcards`.

If you see an error, copy it and send it over before going further.

## Part 2: Create an API key (OneSignal)

OneSignal no longer shows a ready-made "REST API Key". You create one, and
it is shown only once.

1. Open onesignal.com and open the **Hotel Cali** app.
2. Bottom-left, click **Settings** (gear icon), then **Keys & IDs**.
3. Copy the **OneSignal App ID** shown at the top into a notes app. It should
   be `e267f2fa-9af8-491a-9de6-783c01d17c6f`.
4. Further down, under **App API Keys**, click **Add Key**.
5. Name it `supabase-notify`, leave the IP allowlist empty, click **Create**.
6. **Copy the key immediately** into your notes. It starts with
   `os_v2_app_` and OneSignal will never show it again. (Lost it? Delete it
   and add a new one.)
7. While you're in OneSignal, open **Audience → Segments** and note the exact
   name of the segment that means "everyone subscribed". It's usually
   **Subscribed Users**. Newer apps may call it **Total Subscriptions**.

## Part 3: Create the function and its secrets (Supabase)

### 3a. The function

1. Left sidebar: click **Edge Functions**.
2. If `notify-critical` is **not** in the list:
   1. Click **Deploy a new function**, then **Via Editor**.
   2. Delete the sample code in the editor.
   3. Open [`supabase/functions/notify-critical/index.ts`](./supabase/functions/notify-critical/index.ts),
      click **Raw**, copy everything, and paste it in.
   4. Set the function name (bottom of the editor) to exactly `notify-critical`.
   5. Click **Deploy function** and wait for the green "Deployed" message.
3. If `notify-critical` **is** in the list: click it, open the **Code** tab,
   replace everything in `index.ts` with the file above, then click **Deploy**.

### 3b. The secrets

1. In Edge Functions, click **Secrets**. On some dashboards it's under
   **Project Settings → Edge Functions**.
2. Add each of these: name on the left, value on the right, then **Save**.

| Name | Value |
|---|---|
| `ONESIGNAL_APP_ID` | the App ID from Part 2, step 3 |
| `ONESIGNAL_REST_API_KEY` | the `os_v2_app_…` key from Part 2, step 6 |
| `ONESIGNAL_ALL_SEGMENT` | only if your segment is NOT called "Subscribed Users": the exact name from Part 2, step 7 |

Names must match exactly, in capitals with underscores.

## Part 4: Webhooks (Supabase)

A webhook says "when a row is added to table X, call the function".

1. Left sidebar: **Database → Webhooks**. In newer dashboards it's
   **Integrations → Database Webhooks**. If you see **Enable webhooks**,
   click it first.
2. Click **Create a new hook** and fill it in like this:
   - **Name:** `notify-alerts`
   - **Table:** `admin_alerts`
   - **Events:** tick **Insert** only
   - **Type of webhook:** **Supabase Edge Functions**
   - **Edge Function:** `notify-critical`. **Method:** `POST`. **Timeout:**
     set to `5000`.
   - **HTTP Headers:** click **Add auth header with service key**. A row
     called `Authorization` appears. Leave it as it is.
   - Click **Create webhook**.
3. Click **Create a new hook** again. Same settings, except:
   - **Name:** `notify-pings`
   - **Table:** `pings`
4. Optional, emails for postcards (also needs Part 6): one more hook, same
   settings, **Name** `notify-postcards`, **Table** `content_posts`.

You should end up with 2 webhooks (3 with postcard emails). If you already
had one on `wakeup_calls`, you can delete it or leave it; it's ignored now.

## Part 5: Test

1. Open the Vercel preview link from the pull request on your phone. On
   iPhone, first tap Share → **Add to Home Screen** and open it from there,
   because iOS only allows web push for home-screen apps.
2. Under "Who's checking in?" pick your name, tap **Check in**, then
   **Allow** when the phone asks about notifications.
3. Get one floormate to do the same on their phone.
4. On **Front Desk**, post a request. Their phone should buzz within a few
   seconds.
5. If nothing arrives, check in this order:
   - Supabase **Table Editor → pings**: is there a new row? If not, the app
     couldn't write it, so check Part 1.
   - Supabase **Edge Functions → notify-critical → Logs**: is there a call?
     If not, check the webhook (Part 4). If there's an error, it names the
     problem: a wrong key means Part 2/3b; a segment error means set
     `ONESIGNAL_ALL_SEGMENT`.
   - OneSignal **Audience → Subscriptions**: is the phone listed, with an
     External ID like `khushi-vaswani`? If not, re-pick the name and allow
     notifications again.
   - OneSignal **Delivery**: did a message go out?

## Part 6 (optional): Email the admin for each postcard

1. Sign up at resend.com with the email that should receive postcards.
2. **API Keys → Create API Key**, name it `hotel-cali`, copy it.
3. Supabase **Edge Functions → Secrets**, add:
   - `RESEND_API_KEY` = that key
   - `ADMIN_EMAIL` = the email you signed up to Resend with. The free plan
     only sends to your own address unless you verify a domain.
4. Make the `notify-postcards` webhook from Part 4, step 4.

## After merging

Tell the floor: open the app, pick your name once, tap **Enable
notifications on this device**. Until someone does that, pings addressed to
them can't find their phone.
