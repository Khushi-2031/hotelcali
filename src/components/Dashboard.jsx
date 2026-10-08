import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow, deleteRow, sendPing } from '../api'
import { useMe, firstName } from '../identity'
import { SectionHead, Empty, fmtDate, RemoveMine } from './ui'
import { pushToast } from './Toast'
import MealClock from './MealClock'
import DailyMood from './DailyMood'
import TodayAtMica from './TodayAtMica'
import MessMenu from './MessMenu'
import HomeLobby from './HomeLobby'

const PRESETS = [
  'Pick up my clothes from the washing machine',
  'Collect my parcel from the gate',
  'Swap the water can',
  'Lend me an iron',
]

function FrontDeskRequests({ onCount }) {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [text, setText] = useState('')

  async function load() {
    const all = await listAll('front_desk_requests', { ascending: false })
    const cutoff = Date.now() - 3 * 24 * 3600 * 1000
    const recent = all.filter(r => !r.done || new Date(r.created_at).getTime() > cutoff).slice(0, 20)
    setRows(recent)
    onCount && onCount(all.filter(r => !r.done).length)
  }
  useEffect(() => { load() }, [])

  async function post(e) {
    e.preventDefault()
    if (!text.trim()) return
    if (!me) return pushToast('Check in with your name first')
    await insertRow('front_desk_requests', { name: me, details: text.trim() })
    await sendPing({ from: me, recipients: ['ALL'], kind: 'frontdesk', title: 'Front desk request', body: `${firstName(me)}: ${text.trim()}` })
    pushToast('Sent to everyone')
    setText('')
    load()
  }

  async function claim(r) {
    if (!me) return pushToast('Check in with your name first')
    await updateRow('front_desk_requests', r.id, { claimed_by: me })
    if (r.name !== me) await sendPing({ from: me, recipients: [r.name], kind: 'frontdesk', title: 'Front desk', body: `${firstName(me)} is on it: ${r.details}` })
    load()
  }

  async function done(r) {
    await updateRow('front_desk_requests', r.id, { done: true })
    load()
  }

  return (
    <>
      <h3 className="subhead">Front desk requests</h3>
      <form className="inline-form" onSubmit={post}>
        <p className="form-hint">Need a hand? This pings everyone on the floor.</p>
        <div className="quick-chips">
          {PRESETS.map(p => <button type="button" key={p} className="np-chip" onClick={() => setText(p)}>{p}</button>)}
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div><label>Your request</label><input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. washing machine clothes pickup, I'm in class till 5" required /></div>
        </div>
        <button className="btn" type="submit">Ask the floor</button>
      </form>
      {rows.length ? rows.map(r => (
        <div className={`card ${r.done ? 'is-done' : ''}`} key={r.id}>
          <div className="card-top">
            <span className="card-title">{r.details}</span>
            {r.done ? <span className="pill teal">Done</span> : r.claimed_by ? <span className="pill blue">{firstName(r.claimed_by)} is on it</span> : <span className="pill red">Open</span>}
          </div>
          <div className="card-meta">{r.name} · {fmtDate(r.created_at)}</div>
          {!r.done && (
            <div className="card-actions">
              {!r.claimed_by && r.name !== me && <button className="btn small" onClick={() => claim(r)}>I'll do it</button>}
              {(r.name === me || r.claimed_by === me) && <button className="btn small ghost" onClick={() => done(r)}>Mark done</button>}
            </div>
          )}
          {r.name === me && <div><RemoveMine onRemove={async () => { await deleteRow('front_desk_requests', r.id); load() }} /></div>}
        </div>
      )) : <Empty>No open requests. Quiet night at the front desk.</Empty>}
    </>
  )
}

const HIDDEN_KEY = 'hc_hidden_pings'
function readHidden() { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') } catch { return [] } }

function PingsForMe() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [hidden, setHidden] = useState(readHidden())

  useEffect(() => {
    if (!me) return
    listAll('pings', { ascending: false }).then(all => {
      const cutoff = Date.now() - 48 * 3600 * 1000
      setRows(all.filter(p => new Date(p.created_at).getTime() > cutoff && p.from_name !== me &&
        ((p.recipients || []).includes('ALL') || (p.recipients || []).includes(me))))
    })
  }, [me])

  function hide(ids) {
    const next = [...new Set([...hidden, ...ids])].slice(-300)
    setHidden(next)
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const visible = rows.filter(p => !hidden.includes(p.id)).slice(0, 6)
  if (!me || !visible.length) return null
  return (
    <>
      <div className="subhead-row">
        <h3 className="subhead">Pings for you</h3>
        <button className="link-btn" onClick={() => hide(visible.map(p => p.id))}>Clear all</button>
      </div>
      <div className="card">
        {visible.map(p => (
          <div className="ping-row" key={p.id}>
            <div className="ping-top">
              <span className="ping-title">{p.title}</span>
              <button className="ping-x" aria-label="Clear this ping" onClick={() => hide([p.id])}>×</button>
            </div>
            <span className="ping-body">{p.body}</span>
            <span className="card-meta">{fmtDate(p.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Dashboard({ go }) {
  const [stats, setStats] = useState({ blinkit: 0, maint: 0, plans: 0 })
  const [openReq, setOpenReq] = useState(0)

  useEffect(() => {
    (async () => {
      const [blinkit, maint, plans] = await Promise.all([
        listAll('blinkit_orders'), listAll('maintenance_requests'), listAll('plans'),
      ])
      const today = new Date().toDateString()
      setStats({
        blinkit: blinkit.filter(o => !o.done).length,
        maint: maint.filter(m => !m.resolved).length,
        plans: plans.filter(p => new Date(p.created_at).toDateString() === today).length,
      })
    })()
  }, [])

  return (
    <div>
      <HomeLobby go={go} />
      <SectionHead title="Ashoka 4th, at a glance" desc="Everything happening on the floor right now. Pull any thread from the menu for the full picture." />
      <div className="grid">
        <div className="stat"><div className="n">{stats.blinkit}</div><div className="l">Blinkit orders open</div></div>
        <div className="stat"><div className="n">{stats.maint}</div><div className="l">Repairs pending</div></div>
        <div className="stat"><div className="n">{stats.plans}</div><div className="l">Plans posted today</div></div>
        <div className="stat"><div className="n">{openReq}</div><div className="l">Front desk requests open</div></div>
      </div>
      <DailyMood />
      <TodayAtMica />
      <PingsForMe />
      <FrontDeskRequests onCount={setOpenReq} />
      <MessMenu />
      <h3 className="subhead">Mess hours</h3>
      <div className="card"><MealClock compact /></div>
    </div>
  )
}
