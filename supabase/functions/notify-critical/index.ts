// supabase/functions/notify-critical/index.ts
// Deploy with: supabase functions deploy notify-critical
//
// Wire it to Database Webhooks (Database > Webhooks in the Supabase dashboard),
// all pointing at this function:
//   1. table: admin_alerts,  event: INSERT   -> pushes to everyone
//   2. table: pings,         event: INSERT   -> pushes to the people picked in the app (or everyone)
//   3. table: content_posts, event: INSERT   -> optional: emails the admin when a postcard is uploaded
// The old wakeup_calls webhook can stay; wake-up pings now go through `pings`, so it is ignored here.
//
// Secrets (Edge Functions > Secrets):
//   ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY            required
//   RESEND_API_KEY, ADMIN_EMAIL                         optional, only for postcard emails

const slug = (s: string) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function push({ heading, body, recipients }: { heading: string; body: string; recipients: string[] | 'ALL' }) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID')
  const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

  const target = recipients === 'ALL'
    ? { included_segments: ['Subscribed Users'] }
    : { include_aliases: { external_id: recipients.map(slug) }, target_channel: 'push' }

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${restKey}` },
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

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
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
