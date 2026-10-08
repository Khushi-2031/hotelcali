// supabase/functions/notify-critical/index.ts
// Deploy with: supabase functions deploy notify-critical
//
// Wire it to Database Webhooks (Database > Webhooks in the Supabase dashboard),
// all pointing at this function:
//   1. table: admin_alerts,  event: INSERT   -> pushes to everyone
//   2. table: pings,         event: INSERT   -> pushes to the people picked in the app (or everyone)
//   3. table: content_posts, event: INSERT   -> optional: emails the admin when a postcard is uploaded
// Plus a nightly pg_cron job (migration 006) that posts {"type":"digest"} at 12:00 am IST:
// each person gets their classes for the day that just started, everyone gets the mess menu.
// Test it without sending anything: POST {"type":"digest","dry":true} (add "date":"2026-10-09" to pick a day).
// The old wakeup_calls webhook can stay; wake-up pings now go through `pings`, so it is ignored here.
//
// Secrets (Edge Functions > Secrets):
//   ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY            required
//     (the key is an App API Key from OneSignal > Settings > Keys & IDs > Add Key, starts with os_v2_app_)
//   ONESIGNAL_ALL_SEGMENT                               optional, segment used for "everyone"
//     (defaults to "Subscribed Users"; newer apps may call it "Total Subscriptions")
//   RESEND_API_KEY, ADMIN_EMAIL                         optional, only for postcard emails

const slug = (s: string) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function push({ heading, body, recipients }: { heading: string; body: string; recipients: string[] | 'ALL' }) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID')
  const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

  const allSegment = Deno.env.get('ONESIGNAL_ALL_SEGMENT') || 'Subscribed Users'
  // New App API Keys (os_v2_...) use "Key", older REST keys used "Basic".
  const auth = restKey?.startsWith('os_v2') ? `Key ${restKey}` : `Basic ${restKey}`

  const target = recipients === 'ALL'
    ? { included_segments: [allSegment] }
    : { include_aliases: { external_id: recipients.map(slug) }, target_channel: 'push' }

  const res = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: JSON.stringify({
      app_id: appId,
      ...target,
      headings: { en: heading },
      contents: { en: body },
      priority: 10,
    }),
  })
  return await res.json()
}

async function emailAdmin(row: Record<string, string>) {
  const key = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('ADMIN_EMAIL')
  if (!key || !to) return { skipped: 'no RESEND_API_KEY / ADMIN_EMAIL set' }
  const base = Deno.env.get('SUPABASE_URL')
  const fileUrl = row.file_path ? `${base}/storage/v1/object/public/postcards/${row.file_path}` : row.link
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      from: 'Hotel Cali <onboarding@resend.dev>',
      to: [to],
      subject: `New postcard from ${row.name}: ${row.type}`,
      html: `<p><strong>${row.name}</strong> dropped a ${row.type}.</p>`
        + (row.caption ? `<p>Caption idea: ${row.caption}</p>` : '')
        + (fileUrl ? `<p><a href="${fileUrl}">Open the file</a></p>` : ''),
    }),
  })
  return await res.json()
}

// ---- Midnight digest --------------------------------------------------------

const SUPA = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE = Deno.env.get('SITE_URL') || 'https://thehotelcali.vercel.app'

async function rest(path: string) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
  return res.ok ? await res.json() : []
}

const istDate = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const dayName = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const clip = (t: string, n = 40) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t)
const courseName = (c: any) => clip(String(c.title || c.course).replace(/\s*\([^)]*\)/g, '').split(':')[0].trim() || c.course)
const short = (list: string[] = [], n = 4) => list.slice(0, n).join(', ') + (list.length > n ? '…' : '')

async function digest({ date, dry }: { date?: string; dry?: boolean }) {
  const day = date || istDate()
  const [meta, members, menu] = await Promise.all([
    rest('app_meta?key=eq.class_schedule&select=value'),
    rest('member_subjects?select=name,subjects'),
    fetch(`${SITE}/mess-menu.json?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
  ])
  const sched = meta?.[0]?.value || { sessions: [], events: [] }
  const events = (sched.events || []).filter((e: any) => e.date === day)
  const evLine = events.length ? events.map((e: any) => e.title).join(' · ') : ''

  const messages: { to: string[] | 'ALL'; heading: string; body: string }[] = []

  // Classes, one push per person who has picked their specializations.
  for (const m of members as { name: string; subjects: string[] }[]) {
    if (!m.subjects?.length) continue
    const classes = (sched.sessions || [])
      .filter((s: any) => s.date === day && m.subjects.includes(s.subject))
      .sort((a: any, b: any) => a.start.localeCompare(b.start))
    const body = classes.length
      ? classes.map((c: any) => `${c.start} ${courseName(c)}${c.room ? ` (${c.room})` : ''}`).join('\n')
      : 'No classes today.'
    messages.push({ to: [m.name], heading: `Classes, ${dayName(day)}`, body: body + (evLine ? `\n${evLine}` : '') })
  }

  // Mess menu, to everyone.
  const entry = menu?.days?.find((d: any) => d.date === day)
  if (entry) {
    const notes = (menu.notes || []).filter((n: any) => !n.date || n.date === day).map((n: any) => `Change: ${n.text}`)
    const lines = [
      `Breakfast: ${short(entry.breakfast)}`,
      `Lunch: ${short(entry.lunch)}`,
      `Snacks: ${short(entry.snacks)}`,
      `Dinner: ${short(entry.dinner)}${entry.dessert?.length ? ` + ${entry.dessert.join(', ')}` : ''}`,
      ...notes,
    ]
    messages.push({ to: 'ALL', heading: `Mess menu, ${dayName(day)}`, body: lines.join('\n') })
  } else if (evLine) {
    messages.push({ to: 'ALL', heading: `Today, ${dayName(day)}`, body: evLine })
  }

  if (dry) return { day, messages }
  const results = []
  for (const m of messages) results.push(await push({ heading: m.heading, body: m.body, recipients: m.to }))
  return { day, sent: messages.length, results }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    if (payload?.type === 'digest') {
      return new Response(JSON.stringify(await digest(payload)), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const row = payload.record
    const table = payload.table
    if (!row) return new Response(JSON.stringify({ skipped: true }), { status: 200 })

    let result: unknown = { skipped: true }

    if (table === 'admin_alerts') {
      result = await push({ heading: 'Admin alert', body: `${row.message} (${row.name})`, recipients: 'ALL' })
    } else if (table === 'pings') {
      const list: string[] = row.recipients || []
      if (list.length) {
        result = await push({
          heading: row.title || 'Hotel Cali',
          body: row.body || '',
          recipients: list.includes('ALL') ? 'ALL' : list,
        })
      }
    } else if (table === 'content_posts') {
      result = await emailAdmin(row)
    }

    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
