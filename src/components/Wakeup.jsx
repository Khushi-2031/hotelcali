import { useEffect, useState } from 'react'
import { listAll, insertRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { SectionHead, Pill, Empty } from './ui'
import { pushToast } from './Toast'

export default function Wakeup({ onChange }) {
  const [rows, setRows] = useState([])
  const [name, setName] = useState(ALL_PEOPLE[0])
  const [room, setRoom] = useState('')
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [critical, setCritical] = useState(false)

  async function load() { setRows(await listAll('wakeup_calls', { ascending: false })) }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    const wakeAt = new Date(`${date}T${time}`).toISOString()
    await insertRow('wakeup_calls', { name, room, wake_at: wakeAt, notes, critical })
    pushToast('Wake-up call scheduled')
    setNotes(''); setCritical(false)
    load()
    onChange && onChange()
  }

  const now = Date.now()
  const sorted = [...rows].sort((a, b) => (b.critical - a.critical) || (new Date(a.wake_at) - new Date(b.wake_at)))

  return (
    <div>
      <SectionHead title="Wake-up Calls" desc={'Ask the floor to wake you at a specific time. Flag "grade-cut situation" and it jumps to the top as a critical alert for everyone.'} />
      <form className="inline-form" onSubmit={submit}>
        <div className="form-row">
          <div>
            <label>Your name</label>
            <select value={name} onChange={e => setName(e.target.value)}>
              {ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label>Room</label><input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 44" /></div>
        </div>
        <div className="form-row">
          <div><label>Wake me at</label><input type="time" required value={time} onChange={e => setTime(e.target.value)} /></div>
          <div><label>Date</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="knock twice, I sleep through calls" /></div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={critical} onChange={e => setCritical(e.target.checked)} /> Grade-cut situation (critical)
            </label>
          </div>
        </div>
        <button className="btn" type="submit">Post</button>
      </form>

      {sorted.length ? sorted.map(w => (
        <div className={`card ${w.critical ? 'critical' : ''}`} key={w.id}>
          <div className="card-top">
            <span className="card-title">{w.name}{w.room ? ` · Room ${w.room}` : ''}</span>
            {w.critical && <Pill tone="red">Grade-cut · critical</Pill>}
            {new Date(w.wake_at).getTime() < now && <Pill tone="teal">Past</Pill>}
          </div>
          <div className="card-meta">Wake at {new Date(w.wake_at).toLocaleString()}</div>
          {w.notes && <div className="card-body">{w.notes}</div>}
        </div>
      )) : <Empty>No wake-up calls scheduled.</Empty>}
    </div>
  )
}
