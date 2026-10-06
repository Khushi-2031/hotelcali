// Hotel Cali: class schedule sync.
// Run this in a browser tab that is signed in to MICA's SharePoint and open on
// micaschoolofideas-my.sharepoint.com (paste into the console, or let Claude run it).
// It downloads the timetable sheet, turns it into sessions, and saves them to the
// app's database (app_meta key "class_schedule"). The app reads it from there.
// Returns a short summary, including whether anything changed since last time.
(async () => {
  const SITE = '/personal/rajesh_nair_micamail_in/_layouts/15/download.aspx?UniqueId=378B0A86-79DC-4761-A2B8-C90B641C1355'
  const SUPA = 'https://lnrfzkqrrnxvfhrikdyk.supabase.co'
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucmZ6a3Fycm54dmZocmlrZHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njk0ODgsImV4cCI6MjEwNDA0NTQ4OH0.4wakVOgj6oSBe3NAw2C2_bZ1wKacv_A4VKDXv5Xdeh8'
  const GROUPS = {
    S1: 'FMCG & FMCD', S2: 'Media, Entertainment & Sports', S3: 'Consumer Tech', S4: 'Retail Business',
    S5: 'BFSI & FinTech', S6: 'Health-tech', S7: 'Business Analytics & AI', S8: 'Consulting & Tech Consulting',
  }
  const TIMES = { E: ['09:15', '10:30'], F: ['10:45', '12:00'], G: ['12:15', '13:30'], H: ['14:15', '15:30'], I: ['15:45', '17:00'], J: ['17:30', '18:45'], K: ['19:00', '20:15'], L: ['21:00', '22:15'], M: ['19:00', '20:15'], N: ['21:00', '22:15'] }
  const COLS = Object.keys(TIMES)

  // 1. Download and unzip the .xlsx (zip of XML files) with the browser's own inflater.
  const res = await fetch(SITE, { credentials: 'include' })
  if (!res.ok) return { ok: false, error: `download failed ${res.status}` }
  const bin = new Uint8Array(await res.arrayBuffer())
  const dv = new DataView(bin.buffer)
  let eocd = bin.length - 22
  while (dv.getUint32(eocd, true) !== 0x06054b50) eocd--
  const files = {}
  for (let i = 0, p = dv.getUint32(eocd + 16, true), n = dv.getUint16(eocd + 10, true); i < n; i++) {
    const fnl = dv.getUint16(p + 28, true)
    const name = new TextDecoder().decode(bin.subarray(p + 46, p + 46 + fnl))
    files[name] = { method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true), lho: dv.getUint32(p + 42, true) }
    p += 46 + fnl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true)
  }
  const read = async (name) => {
    const f = files[name]
    const s = f.lho + 30 + dv.getUint16(f.lho + 26, true) + dv.getUint16(f.lho + 28, true)
    const data = bin.subarray(s, s + f.csize)
    if (f.method === 0) return new TextDecoder().decode(data)
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
  }
  const P = new DOMParser()
  const xml = async (n) => P.parseFromString(await read(n), 'application/xml')
  const ss = [...(await xml('xl/sharedStrings.xml')).getElementsByTagName('si')]
    .map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''))
  const sheet = async (n) => {
    const x = await xml(n), cells = {}
    for (const c of x.getElementsByTagName('c')) {
      const v = c.getElementsByTagName('v')[0]?.textContent
      if (v == null || v === '') continue
      cells[c.getAttribute('r')] = (c.getAttribute('t') === 's' ? ss[+v] : v).replace(/\s+/g, ' ').trim()
    }
    const merges = [...x.getElementsByTagName('mergeCell')].map(m => m.getAttribute('ref'))
    return { cells, merges }
  }

  // 2. Course titles from the Course_Details sheet.
  const titles = {}
  const det = await sheet('xl/worksheets/sheet2.xml')
  for (const [ref, v] of Object.entries(det.cells)) {
    if (ref.startsWith('C') && /^S\d-C\d/.test(v)) titles[v] = det.cells['B' + ref.slice(1)]
  }

  // 3. Timetable grid.
  const { cells, merges } = await sheet('xl/worksheets/sheet1.xml')
  const colNum = (c) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0)
  const origin = {} // "COLrow" -> { col, row, rows: [r1..r2], cols: [...] }
  for (const m of merges) {
    const [a, b] = m.split(':'); const [, c1, r1] = a.match(/([A-Z]+)(\d+)/); const [, c2, r2] = b.match(/([A-Z]+)(\d+)/)
    const rows = []; for (let r = +r1; r <= +r2; r++) rows.push(r)
    const cols = COLS.concat('B', 'C', 'D').filter(c => colNum(c) >= colNum(c1) && colNum(c) <= colNum(c2))
    for (const r of rows) for (const c of cols) origin[c + r] = { at: c1 + r1, rows, cols, top: +r1, left: c1 }
  }
  const val = (c, r) => cells[c + r] ?? (origin[c + r] ? cells[origin[c + r].at] : undefined)
  const serialToDate = (n) => new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10)

  let lastRow = 0
  for (const ref of Object.keys(cells)) lastRow = Math.max(lastRow, +ref.match(/\d+/)[0])
  const dateOf = {}
  let cur = null
  for (let r = 6; r <= lastRow; r++) {
    const b = val('B', r)
    if (b && /^\d{5}$/.test(b)) cur = serialToDate(+b)
    dateOf[r] = cur
  }

  const sessions = [], events = [], seenEvt = new Set()
  for (let r = 6; r <= lastRow; r++) {
    const date = dateOf[r]
    if (!date) continue
    for (const c of COLS) {
      const o = origin[c + r]
      if (o && (o.top !== r || o.left !== c && COLS.includes(o.left))) continue // emit merged cells once, at their top-left
      const text = val(c, r)
      if (!text) continue
      const span = o ? o.rows : [r]
      const course = text.match(/^S\d-C\d-[^\s(]+/)?.[0]
      if (!course) {
        // Holiday, exams, placements, student activity: shown to everyone.
        const allDay = !o || (colNum(o.left) <= colNum('E') && o.cols.length >= 6)
        for (const rr of span) {
          const d = dateOf[rr]; const key = d + text
          if (!d || seenEvt.has(key)) continue
          seenEvt.add(key)
          events.push({ date: d, title: text, start: allDay ? null : TIMES[c][0], end: allDay ? null : TIMES[o ? o.cols.at(-1) : c][1] })
        }
        continue
      }
      const rest = text.slice(course.length)
      const faculty = rest.match(/^\s*\(?\s*([A-Za-z][^()\d]*?)\s*(?:\)|\(|$)/)?.[1] || rest.match(/\(\s*([^()\d][^()]*?)\s*(?:\)|\(|$)/)?.[1] || null
      const nums = [...rest.matchAll(/\(?\s*(\d{1,2})\s*\)?/g)].map(m => +m[1])
      const note = rest.match(/resched[^()]*/i)?.[0].trim() || null
      const rooms = [...new Set(span.map(rr => val('D', rr)).filter(Boolean))]
      sessions.push({
        date, start: TIMES[c][0], end: TIMES[c][1],
        subject: course.slice(0, 2), course, title: titles[course] || null,
        faculty, n: nums.length ? nums.at(-1) : null, room: rooms.join(' + ') || null, note,
      })
    }
  }
  sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  events.sort((a, b) => a.date.localeCompare(b.date))

  const out = {
    source: 'Schedule_Term-3_phase-2 (SharePoint)',
    term: cells.B3 || null,
    groups: GROUPS,
    sessions, events,
  }

  window.__hcSchedule = out
  // 4. Save, only if something changed.
  const hdr = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }
  const prev = await fetch(`${SUPA}/rest/v1/app_meta?key=eq.class_schedule&select=value`, { headers: hdr }).then(r => r.json()).catch(() => [])
  const before = prev?.[0]?.value
  // Postgres reorders JSON keys, so compare with a fixed key order.
  const KEYS = ['s', 'e', 'date', 'start', 'end', 'subject', 'course', 'title', 'faculty', 'n', 'room', 'note']
  const canon = (v) => v && JSON.stringify({ s: v.sessions, e: v.events }, KEYS)
  const changed = canon(before) !== canon(out)
  const now = new Date().toISOString()
  out.updated_at = changed ? now : (before?.updated_at || now)
  out.checked_at = now
  const save = await fetch(`${SUPA}/rest/v1/app_meta`, {
    method: 'POST', headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'class_schedule', value: out }),
  })
  return {
    ok: save.ok, status: save.status, changed,
    sessions: sessions.length, events: events.length,
    first: sessions[0]?.date, last: sessions.at(-1)?.date,
  }
})()
