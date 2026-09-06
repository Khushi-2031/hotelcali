// supabase/functions/notify-critical/index.ts
// Deploy with: supabase functions deploy notify-critical
// Wire it to TWO Database Webhooks (Database > Webhooks in the Supabase dashboard):
//   1. table: wakeup_calls, event: INSERT
//   2. table: admin_alerts, event: INSERT

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const row = payload.record
    const table = payload.table

    let heading = ''
    let body = ''

    if (table === 'admin_alerts' && row) {
      heading = 'Admin alert'
      body = `${row.message} — ${row.name}`
    } else if (table === 'wakeup_calls' && row?.critical) {
      heading = 'Grade-cut alarm'
      body = `${row.name} needs waking at ${new Date(row.wake_at).toLocaleTimeString()}${row.room ? ' · Room ' + row.room : ''}`
    } else {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['Subscribed Users'],
        headings: { en: heading },
        contents: { en: body },
        priority: 10,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
