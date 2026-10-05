import { useEffect, useMemo, useState } from 'react'
import { SectionHead, Empty } from './ui'
import { activityFeed } from '../track'
import { SECTIONS } from './Sidebar'
import { ALL_PEOPLE } from '../data/roster'

const tabName = (id) => SECTIONS.find(s => s.id === id)?.label || id || ''
const RANGES = [
  { id: 'today', label: 'Today', since: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d } },
  { id: 'week', label: '7 days', since: () => new Date(Date.now() - 7 * 864e5) },
  { id: 'month', label: '30 days', since: () => new Date(Date.now() - 30 * 864e5) },
]
const time = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const day = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const ago = (ts) => {
  const m = Math.round((Date.now() - new Date(ts)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 1440) return `${Math.round(m / 60)} hr ago`
  return `${Math.round(m / 1440)} d ago`
}

function describe(r) {
  if (r.kind === 'open') return <>opened the app{r.target && r.target !== 'dashboard' ? <> on <b>{tabName(r.target)}</b></> : ''}</>
  if (r.kind === 'tab') return <>went to <b>{tabName(r.target)}</b></>
  return <>tapped <b>“{r.target}”</b>{r.tab ? <> in {tabName(r.tab)}</> : ''}</>
}

function Unlock({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await activityFeed(pin, new Date(Date.now() - 60000).toISOString())
    setBusy(false)
    if (error) {
      setPin('')
      if (/wrong pin/.test(error.message)) return setErr("That's not your check-in PIN.")
      if (/activity_feed/.test(error.message)) return setErr('Run migration 005 in Supabase first.')
      return setErr("Couldn't reach the log. Try again.")
    }
    onUnlock(pin, data)
  }
  return (
    <form className="inline-form" onSubmit={submit} data-no-track>
      <label htmlFor="act-pin">Your check-in PIN</label>
      <input id="act-pin" className="pin-input" type="password" inputMode="numeric" maxLength={4} value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required />
      {err && <p className="form-error">{err}</p>}
      <button className="btn" disabled={busy || pin.length !== 4}>{busy ? 'Opening…' : 'Open the log'}</button>
    </form>
  )
}

export default function Activity() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('hc_act_pin') || '')
  const [range, setRange] = useState('today')
  const [person, setPerson] = useState('all')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  async function load(p = pin) {
    setErr('')
    const since = RANGES.find(r => r.id === range).since().toISOString()
    const { data, error } = await activityFeed(p, since)
    if (error) {
      if (/wrong pin/.test(error.message)) { sessionStorage.removeItem('hc_act_pin'); setPin('') }
      return setErr("Couldn't load the log.")
    }
    setRows(data || [])
  }
  useEffect(() => { if (pin) load() }, [pin, range])

  const shown = useMemo(() => (rows || []).filter(r => person === 'all' || r.name === person), [rows, person])

  const people = useMemo(() => {
    const m = {}
    for (const r of rows || []) {
      const p = m[r.name] ||= { name: r.name, room: r.room, last: r.created_at, opens: 0, taps: 0, tabs: {} }
      if (r.kind === 'open') p.opens++
      if (r.kind === 'tap') p.taps++
      if (r.kind === 'tab' || r.kind === 'open') p.tabs[r.target] = (p.tabs[r.target] || 0) + 1
    }
    return Object.values(m).sort((a, b) => new Date(b.last) - new Date(a.last))
  }, [rows])

  const topTabs = useMemo(() => {
    const m = {}
    for (const r of shown) if (r.kind === 'tab') m[r.target] = (m[r.target] || 0) + 1
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [shown])
  const topTaps = useMemo(() => {
    const m = {}
    for (const r of shown) if (r.kind === 'tap') m[r.target] = (m[r.target] || 0) + 1
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [shown])

  function exportCsv() {
    const head = 'time,name,room,kind,tab,target,device\n'
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const body = shown.map(r => [new Date(r.created_at).toLocaleString(), r.name, r.room, r.kind, r.tab, r.target, r.device].map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }))
    a.download = `hotel-cali-activity-${range}.csv`
    a.click()
  }

  const head = <SectionHead title="Activity Log" desc="Who opened the app, which tabs they went to and which buttons they tapped. Only you can see this. Nothing anyone types is recorded." />

  if (!pin) return <div>{head}<Unlock onUnlock={(p) => { sessionStorage.setItem('hc_act_pin', p); setPin(p) }} /></div>

  const silent = ALL_PEOPLE.filter(n => !people.some(p => p.name === n))
  const max = Math.max(1, ...topTabs.map(t => t[1]))

  return (
    <div data-no-track>
      {head}
      <div className="seg">{RANGES.map(r => <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>)}</div>
      <div className="act-tools">
        <select value={person} onChange={e => setPerson(e.target.value)} aria-label="Person">
          <option value="all">Everyone</option>
          {ALL_PEOPLE.concat('Guest').map(n => <option key={n}>{n}</option>)}
        </select>
        <button className="btn ghost small" onClick={() => load()}>Refresh</button>
        <button className="btn ghost small" onClick={exportCsv} disabled={!shown.length}>Download CSV</button>
        <button className="btn ghost small" onClick={() => { sessionStorage.removeItem('hc_act_pin'); setPin(''); setRows(null) }}>Lock</button>
      </div>
      {err && <p className="form-error">{err}</p>}
      {rows === null ? <Empty>Loading…</Empty> : !rows.length ? (
        <Empty>Nothing logged in this period yet.</Empty>
      ) : (
        <>
          <div className="grid">
            <div className="stat"><div className="n">{people.length}</div><div className="l">people active</div></div>
            <div className="stat"><div className="n">{people.reduce((s, p) => s + p.opens, 0)}</div><div className="l">app opens</div></div>
            <div className="stat"><div className="n">{rows.filter(r => r.kind === 'tab').length}</div><div className="l">tab visits</div></div>
            <div className="stat"><div className="n">{rows.filter(r => r.kind === 'tap').length}</div><div className="l">button taps</div></div>
          </div>

          {person === 'all' && (
            <div className="act-block">
              <h3>Who's been in</h3>
              <ul className="act-people">
                {people.map(p => {
                  const fav = Object.entries(p.tabs).sort((a, b) => b[1] - a[1])[0]
                  return (
                    <li key={p.name}>
                      <button className="act-person" onClick={() => setPerson(p.name)}>
                        <b>{p.name}</b><span className="muted"> · {p.room ? `Room ${p.room}` : 'Guest'}</span>
                        <span className="act-meta">Last seen {ago(p.last)} · {p.opens} opens · {p.taps} taps{fav ? ` · mostly ${tabName(fav[0])}` : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {silent.length > 0 && <p className="muted act-silent">Not seen in this period: {silent.join(', ')}</p>}
            </div>
          )}

          <div className="act-grid">
            <div className="act-block">
              <h3>Most visited tabs</h3>
              {topTabs.length ? topTabs.map(([t, n]) => (
                <div key={t} className="act-bar"><span>{tabName(t)}</span><i style={{ width: `${(n / max) * 100}%` }} /><b>{n}</b></div>
              )) : <p className="muted">No tab visits yet.</p>}
            </div>
            <div className="act-block">
              <h3>Most tapped buttons</h3>
              {topTaps.length ? <ol className="act-taps">{topTaps.map(([t, n]) => <li key={t}><span>{t}</span><b>{n}</b></li>)}</ol> : <p className="muted">No taps yet.</p>}
            </div>
          </div>

          <div className="act-block">
            <h3>{person === 'all' ? 'Everything, newest first' : `${person}, newest first`}</h3>
            <ul className="act-feed">
              {shown.slice(0, 400).map((r, i) => {
                const newDay = i === 0 || day(r.created_at) !== day(shown[i - 1].created_at)
                return (
                  <li key={r.id} className={`k-${r.kind}`}>
                    {newDay && <p className="act-day">{day(r.created_at)}</p>}
                    <span className="act-time">{time(r.created_at)}</span>
                    <span>{person === 'all' && <b>{r.name.split(' ')[0]} </b>}{describe(r)}</span>
                    <span className="act-dev">{r.device}</span>
                  </li>
                )
              })}
            </ul>
            {shown.length > 400 && <p className="muted">Showing the latest 400. Download the CSV for everything.</p>}
          </div>
        </>
      )}
    </div>
  )
}
