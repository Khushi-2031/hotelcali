import { useEffect, useMemo, useState } from 'react'
import { SectionHead } from './ui'

// Goblet of Fire 2026 (Hostel Wars). Data is read live from the official site
// (gof-2026.pages.dev/api/data) through the /api/gof rewrite in vercel.json,
// so results show up here as soon as the organisers post them.
const SOURCE = 'https://gof-2026.pages.dev'
const OUR_HOUSE = 'Ravenclaw' // Ashoka 4th is in Ravenclaw
const HOSTELS = {
  Gryffindor: 'Champa, Kalpvriksh, Kachnar, Silver Oak',
  Slytherin: 'Palaash, Parijat',
  Hufflepuff: 'Chinar, Gulmohar, Chandni, Rudraksh, Ashoka 1 & 3',
  Ravenclaw: 'Amaltas, Shishya Gramah, Ashoka G, 2 & 4',
}
const REFRESH_MS = 5 * 60 * 1000

let cache = null
let inflight = null
const subs = new Set()

function load() {
  if (inflight) return inflight
  inflight = fetch(`/api/gof?t=${Math.floor(Date.now() / 60000)}`)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(d => { cache = { data: d, at: Date.now() } })
    .catch(() => { cache = cache ? { ...cache, failed: true } : { data: null, failed: true } })
    .finally(() => { inflight = null; subs.forEach(f => f(cache)) })
  return inflight
}

export function useGof() {
  const [state, setState] = useState(cache)
  useEffect(() => {
    subs.add(setState)
    if (!cache || Date.now() - cache.at > 60000 || !cache.at) load()
    const id = setInterval(load, REFRESH_MS)
    const onVis = () => document.visibilityState === 'visible' && cache && Date.now() - (cache.at || 0) > 60000 && load()
    document.addEventListener('visibilitychange', onVis)
    return () => { subs.delete(setState); clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return state
}

// Same scoring the official site shows: knockout semi-final winners get
// provisional runner-up points ("F") until the final is played, except in a
// house's Double or Nothing event, which is only scored after the final.
export function standingsOf(d) {
  if (!d) return []
  const don = new Set((d.don || []).filter(x => x.valid && x.event).map(x => `${x.event}|${x.house}`))
  const decided = new Set((d.pointsLog || []).filter(x => x.status === 'Decided').map(x => x.event))
  const events = Object.fromEntries((d.events || []).map(e => [e.name, e]))
  const prov = {}
  const finals = {}
  for (const m of d.matches || []) {
    const e = events[m.event]
    if (!e || e.format !== 'Knockout' || !String(m.stage).startsWith('Semi') || !m.official || !m.winner) continue
    if (don.has(`${m.event}|${m.winner}`) || decided.has(m.event)) continue
    const already = (d.pointsLog || []).find(x => x.event === m.event && x.house === m.winner && x.place)
    if (already) continue
    prov[m.winner] = (prov[m.winner] || 0) + e.points2nd
    finals[m.winner] = (finals[m.winner] || 0) + 1
  }
  const rows = (d.houseTotals || []).map(h => ({ ...h, total: h.total + (prov[h.house] || 0), finals: finals[h.house] || 0 }))
  rows.sort((a, b) => b.total - a.total || b.firsts - a.firsts || a.house.localeCompare(b.house))
  const top = rows[0]?.total || 0
  return rows.map(r => ({ ...r, rank: rows.filter(x => x.total > r.total).length + 1, behind: top - r.total }))
}

// A "night" runs until rolloverHour (5am IST), like on the official site.
export function tonightOf(meta, now = Date.now()) {
  const off = 330 * 60000
  const d = new Date(now + off - (meta?.rolloverHour ?? 5) * 3600000)
  return d.toISOString().slice(0, 10)
}

function nightsBetween(a, b) {
  const out = []
  for (let t = Date.parse(a + 'T00:00:00Z'); t <= Date.parse(b + 'T00:00:00Z'); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

const time12 = (hm) => {
  if (!hm) return 'TBA'
  const [h, m] = hm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const nightLabel = (n, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(n + 'T12:00:00Z').toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })
const ordinal = (n) => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`

function colourOf(d, house) { return d?.houses?.find(h => h.name === house)?.colour || 'var(--line-2)' }

function House({ d, name, win }) {
  if (!name) return <span className="gof-team muted">TBD</span>
  return (
    <span className={`gof-team ${win ? 'win' : ''} ${name === OUR_HOUSE ? 'ours' : ''}`}>
      <i style={{ background: colourOf(d, name) }} />{name}
    </span>
  )
}

function stateOf(m, now) {
  if (m.status === 'Completed') return 'done'
  const s = Date.parse(m.startsAt), e = Date.parse(m.endsAt)
  if (s && now >= s && (e ? now < e : now < s + 2 * 3600000)) return 'live'
  return 'upcoming'
}

function MatchCard({ d, m, now, showNight }) {
  const st = stateOf(m, now)
  const single = !m.teamA && !m.teamB && m.stage === 'Single round'
  const donHouses = (d.don || []).filter(x => x.valid && x.event === m.event).map(x => x.house)
  if (m.type !== 'Sport') {
    return (
      <div className="gof-match is-event">
        <div className="gof-when">{m.start ? time12(m.start) : ''}</div>
        <div className="gof-body"><span className="card-title">{m.name}</span>{m.venue && <span className="card-meta">{m.venue}</span>}</div>
      </div>
    )
  }
  return (
    <div className={`gof-match is-${st}`}>
      <div className="gof-when">
        {showNight && <small>{nightLabel(m.night, { weekday: 'short', day: 'numeric' })}</small>}
        {time12(m.start)}
      </div>
      <div className="gof-body">
        <div className="gof-head">
          <span className="gof-event">{m.event}{m.stage && m.stage !== 'Single round' ? ` · ${m.stage.replace('Semi', 'Semi-final')}` : ''}</span>
          {st === 'live' && <span className="pill red">Live</span>}
          {st === 'done' && <span className="pill blue">Done</span>}
        </div>
        {single ? (
          <div className="gof-vs">{m.winner ? <House d={d} name={m.winner} win /> : <span className="gof-team muted">All four houses</span>}</div>
        ) : (
          <div className="gof-vs">
            <House d={d} name={m.teamA} win={m.winner === m.teamA} />
            <span className="gof-v">vs</span>
            <House d={d} name={m.teamB} win={m.winner === m.teamB} />
          </div>
        )}
        <div className="card-meta">
          {[m.score, m.winner && !single && `Winner: ${m.winner}`, m.venue, donHouses.length && `Double or Nothing: ${donHouses.join(', ')}`].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

function Leaderboard({ d, rows }) {
  return (
    <div className="card gof-board">
      {rows.map(r => (
        <div key={r.house} className={`gof-row ${r.house === OUR_HOUSE ? 'ours' : ''}`} style={{ '--house': colourOf(d, r.house) }}>
          <span className="gof-rank">{ordinal(r.rank)}</span>
          <span className="gof-name">
            <b>{r.house}{r.house === OUR_HOUSE && <em> our house</em>}</b>
            <small>{HOSTELS[r.house]}</small>
          </span>
          <span className="gof-pts"><b>{r.total}</b><small>{r.behind ? `−${r.behind}` : 'leading'}</small></span>
        </div>
      ))}
      <div className="card-meta">Includes provisional finalist points, as on the official site. The winner of each final gets the rest once it's played.</div>
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id) }, [])
  return now
}

export default function GoF() {
  const g = useGof()
  const d = g?.data
  const now = useNow()
  const rows = useMemo(() => standingsOf(d), [d])
  const nights = useMemo(() => (d ? nightsBetween(d.meta.startDate, d.meta.endDate) : []), [d])
  const tonight = d ? tonightOf(d.meta, now) : null
  const defaultNight = nights.length ? (tonight < nights[0] ? nights[0] : tonight > nights[nights.length - 1] ? nights[nights.length - 1] : tonight) : null
  const [night, setNight] = useState(null)
  const sel = night || defaultNight
  const byNight = useMemo(() => {
    const m = {}
    for (const x of d?.matches || []) (m[x.night] ||= []).push(x)
    Object.values(m).forEach(l => l.sort((a, b) => (a.sort || 0) - (b.sort || 0)))
    return m
  }, [d])
  const results = useMemo(() => (d?.matches || []).filter(m => m.type === 'Sport' && m.status === 'Completed')
    .sort((a, b) => (b.night.localeCompare(a.night)) || (b.sort || 0) - (a.sort || 0)).slice(0, 6), [d])

  return (
    <div>
      <SectionHead title="House Cup" desc="Goblet of Fire 2026: live standings and the match schedule, straight from the official GoF site. We're Ravenclaw." />
      {!g ? <div className="card"><div className="card-meta">Loading the House Cup…</div></div>
        : !d ? <div className="card"><div className="card-meta">Couldn't reach the GoF site right now. <a href={SOURCE} target="_blank" rel="noreferrer">Open it directly</a>.</div></div>
        : <>
          <h3 className="subhead">Leaderboard</h3>
          <Leaderboard d={d} rows={rows} />

          <h3 className="subhead">Schedule</h3>
          <div className="quick-chips gof-days">
            {nights.map(n => {
              const count = (byNight[n] || []).filter(x => x.type === 'Sport').length
              return (
                <button key={n} type="button" className={`np-chip ${n === sel ? 'on' : ''} ${n < tonight ? 'past' : ''}`} aria-pressed={n === sel} onClick={() => setNight(n)}>
                  {n === tonight ? 'Tonight' : nightLabel(n, { weekday: 'short', day: 'numeric' })}{count ? ` · ${count}` : ''}
                </button>
              )
            })}
          </div>
          <div className="card gof-list">
            <div className="card-meta gof-daytitle">{nightLabel(sel, { weekday: 'long', day: 'numeric', month: 'long' })}{sel === tonight ? ' (tonight)' : ''}</div>
            {(byNight[sel] || []).length ? byNight[sel].map(m => <MatchCard key={m.id} d={d} m={m} now={now} />)
              : <div className="card-meta">Nothing scheduled this night.</div>}
          </div>

          {results.length > 0 && <>
            <h3 className="subhead">Latest results</h3>
            <div className="card gof-list">{results.map(m => <MatchCard key={m.id} d={d} m={m} now={now} showNight />)}</div>
          </>}

          <div className="card-meta">
            Updated {new Date(g.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}{g.failed ? ' (couldn\'t refresh, showing the last copy)' : ''}. Refreshes every few minutes. Full brackets and points table on <a href={SOURCE} target="_blank" rel="noreferrer">gof-2026.pages.dev</a>.
          </div>
        </>}
    </div>
  )
}

function useGofNow() {
  const g = useGof()
  const d = g?.data
  const now = useNow()
  if (!d) return null
  const tonight = tonightOf(d.meta, now)
  if (tonight < d.meta.startDate || tonight > d.meta.endDate) return null
  const rows = standingsOf(d)
  const upcoming = (d.matches || []).filter(m => m.type === 'Sport' && m.status !== 'Completed' && m.night >= tonight)
    .sort((a, b) => a.night.localeCompare(b.night) || (a.sort || 0) - (b.sort || 0))
  const ours = upcoming.find(m => m.teamA === OUR_HOUSE || m.teamB === OUR_HOUSE || (!m.teamA && !m.teamB))
  const tonightList = (d.matches || []).filter(m => m.type === 'Sport' && m.night === tonight).sort((a, b) => (a.sort || 0) - (b.sort || 0))
  return { d, now, tonight, rows, me: rows.find(r => r.house === OUR_HOUSE), ours, tonightList }
}

const stageWord = (m) => (m.stage && m.stage !== 'Single round' ? ` ${m.stage.replace('Semi', 'semi')}` : '')
const opponent = (m) => (m.teamA === OUR_HOUSE ? m.teamB : m.teamB === OUR_HOUSE ? m.teamA : '')
const whenWord = (m, tonight) => `${m.night === tonight ? 'tonight' : nightLabel(m.night, { weekday: 'short' })} ${time12(m.start)}`

// Card for the "right now" strip at the top of Home.
export function GofNowCard({ go }) {
  const x = useGofNow()
  if (!x?.me) return null
  const { me, ours, tonight } = x
  return (
    <button type="button" className="now-card gof-now" onClick={() => go('gof')}>
      <span className="now-kicker">GoF · House Cup</span>
      <span className="now-title">Ravenclaw {ordinal(me.rank)} · {me.total} pts</span>
      <span className="now-sub">{ours ? `Next: ${ours.event}${stageWord(ours)}${opponent(ours) ? ` vs ${opponent(ours)}` : ''}, ${whenWord(ours, tonight)}` : me.behind ? `${me.behind} behind the leader` : 'Top of the table'}</span>
    </button>
  )
}

// Blue House Cup panel on the Front Desk during the tournament.
export function GofMini({ go }) {
  const x = useGofNow()
  if (!x) return null
  const { d, now, tonight, rows, me, tonightList } = x
  return (
    <section className="gof-panel" aria-label="House Cup">
      <div className="gof-panel-head">
        <span className="gof-panel-kicker">Goblet of Fire 2026</span>
        <span className="gof-panel-title">Go Ravenclaw!</span>
        {me && <span className="gof-panel-sub">We're {ordinal(me.rank)} with {me.total} pts{me.behind ? `, ${me.behind} behind the leader` : ', leading the House Cup'}</span>}
      </div>
      <div className="gof-mini-rows">
        {rows.map(r => (
          <span key={r.house} className={`gof-mini-row ${r.house === OUR_HOUSE ? 'ours' : ''}`}>
            <i style={{ background: colourOf(d, r.house) }} />{ordinal(r.rank)} {r.house}<b>{r.total}</b>
          </span>
        ))}
      </div>
      <div className="gof-panel-tonight">
        <span className="gof-panel-label">Tonight</span>
        {tonightList.length ? tonightList.map(m => {
          const st = stateOf(m, now)
          const mine = m.teamA === OUR_HOUSE || m.teamB === OUR_HOUSE
          return (
            <div key={m.id} className={`gof-panel-match ${mine ? 'mine' : ''} is-${st}`}>
              <span className="t">{time12(m.start)}</span>
              <span className="e">{m.event}{stageWord(m)}{m.teamA || m.teamB ? `: ${m.teamA || 'TBD'} vs ${m.teamB || 'TBD'}` : ''}</span>
              <span className="s">{st === 'live' ? 'LIVE' : st === 'done' ? (m.winner ? `${m.winner} won` : 'Done') : ''}</span>
            </div>
          )
        }) : <div className="gof-panel-match"><span className="e">No matches tonight.</span></div>}
      </div>
      <button type="button" className="btn small gof-panel-btn" onClick={() => go('gof')}>Full leaderboard & schedule</button>
    </section>
  )
}
