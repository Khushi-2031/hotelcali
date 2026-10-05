import { useEffect, useState } from 'react'
import { listAll, insertRow, deleteRow } from '../api'
import { useMe, firstName } from '../identity'
import { ymd } from '../data/academicCalendar'
import { SectionHead, Empty, RemoveMine } from './ui'
import { PostingAs } from './People'
import { pushToast } from './Toast'

const MAX_PER_DAY = 5

function localInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function hours(ms) {
  const m = Math.round(ms / 60000)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

const fmtT = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
const dur = (r) => new Date(r.slept_till) - new Date(r.slept_from)

export default function SleepLog() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const now = new Date()
  const lastNight = new Date(now); lastNight.setHours(now.getHours() - 8, 0, 0, 0)
  const [from, setFrom] = useState(localInput(lastNight))
  const [till, setTill] = useState(localInput(now))
  const [err, setErr] = useState('')

  async function load() {
    const all = await listAll('sleep_logs', { ascending: false })
    setRows(all.filter(r => r.name === me))
  }
  useEffect(() => { load() }, [me])

  const today = ymd()
  const todays = rows.filter(r => r.day === today)

  async function save(e) {
    e.preventDefault()
    setErr('')
    const f = new Date(from), t = new Date(till)
    if (!(t > f)) return setErr('Wake-up time has to be after the time you slept.')
    if (t - f > 20 * 3600 * 1000) return setErr('That is over 20 hours. Check the dates.')
    const day = ymd(t)
    if (rows.filter(r => r.day === day).length >= MAX_PER_DAY) return setErr(`You can log up to ${MAX_PER_DAY} sleeps a day.`)
    await insertRow('sleep_logs', { name: me, day, slept_from: f.toISOString(), slept_till: t.toISOString() })
    pushToast('Sleep logged')
    load()
  }

  // Last 7 days totals
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = ymd(d)
    const total = rows.filter(r => r.day === key).reduce((s, r) => s + dur(r), 0)
    return { key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total }
  })
  const max = Math.max(9 * 3600000, ...week.map(w => w.total))
  const todayTotal = todays.reduce((s, r) => s + dur(r), 0)
  const avg = week.filter(w => w.total).reduce((s, w, _, a) => s + w.total / a.length, 0)

  return (
    <div>
      <SectionHead title="Sleep Log" desc={`Log when you slept and woke up, up to ${MAX_PER_DAY} times a day, naps included. Only you see your log.`} />

      <div className="card sleep-summary">
        <div><span className="tab-big-label">Slept today</span><div className="tab-big">{todayTotal ? hours(todayTotal) : '0h'}</div></div>
        <div className="card-meta">{avg ? `7-day average: ${hours(avg)}` : 'Log a few days to see your average.'}</div>
      </div>

      <form className="inline-form" onSubmit={save}>
        <PostingAs />
        <div className="form-row">
          <div><label>Slept from</label><input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} required /></div>
          <div><label>Woke up at</label><input type="datetime-local" value={till} onChange={e => setTill(e.target.value)} required /></div>
        </div>
        {err && <div className="form-error" role="alert">{err}</div>}
        <button className="btn" type="submit" disabled={todays.length >= MAX_PER_DAY}>{todays.length >= MAX_PER_DAY ? 'Five logged today' : 'Log sleep'}</button>
        <p className="form-hint" style={{ marginTop: 10 }}>{todays.length} of {MAX_PER_DAY} logged today. A sleep counts towards the day you woke up.</p>
      </form>

      <h3 className="subhead">This week</h3>
      <div className="card sleep-week">
        {week.map(w => (
          <div className="sleep-bar" key={w.key}>
            <div className="sleep-track"><div className="sleep-fill" style={{ height: `${Math.round(w.total / max * 100)}%` }} /></div>
            <span className="sleep-day">{w.label}</span>
            <span className="sleep-h">{w.total ? (w.total / 3600000).toFixed(1) : '–'}</span>
          </div>
        ))}
      </div>

      <h3 className="subhead">Today's sleeps</h3>
      {todays.length ? todays.map(r => (
        <div className="card" key={r.id}>
          <div className="card-top">
            <span className="card-title">{fmtT(r.slept_from)} to {fmtT(r.slept_till)}</span>
            <span className="tab-amt">{hours(dur(r))}</span>
          </div>
          <RemoveMine onRemove={async () => { await deleteRow('sleep_logs', r.id); load() }} />
        </div>
      )) : <Empty>Nothing logged today, {firstName(me)}.</Empty>}
    </div>
  )
}
