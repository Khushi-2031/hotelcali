import { useEffect, useState } from 'react'
import { listAll, insertRow, deleteRow, sendPing } from '../api'
import { SectionHead, Pill, Empty, RemoveMine } from './ui'
import { pushToast } from './Toast'
import { NotifyPicker, PostingAs } from './People'
import { useMe, useRoom, firstName } from '../identity'

export default function Wakeup({ onChange }) {
  const me = useMe()
  const [rows, setRows] = useState([])
  const name = me
  const myRoom = useRoom()
  const [to, setTo] = useState([])
  const [room, setRoom] = useState(myRoom)
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
    const at = new Date(wakeAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    await sendPing({
      from: name, recipients: to, kind: 'wakeup',
      title: critical ? 'Grade-cut wake-up call' : 'Wake-up call',
      body: `${firstName(name)}${room ? ' (Room ' + room + ')' : ''} needs waking at ${at}.${notes.trim() ? ' ' + notes.trim() : ''}`,
    })
    pushToast(to.length ? 'Scheduled and pinged' : 'Wake-up call scheduled')
    setNotes(''); setCritical(false); setTo([])
    load()
    onChange && onChange()
  }

  const now = Date.now()
  const sorted = [...rows].sort((a, b) => (b.critical - a.critical) || (new Date(a.wake_at) - new Date(b.wake_at)))

  return (
    <div>
      <SectionHead title="Wake-up Calls" desc={'Ask the floor to wake you at a specific time and ping the people who should knock. Flag "grade-cut situation" and it jumps to the top as a critical alert.'} />
      <form className="inline-form" onSubmit={submit}>
        <PostingAs />
        <div className="form-row">
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
              <input type="checkbox" style={{ width: 'auto' }} checked={critical} onChange={e => { setCritical(e.target.checked); if (e.target.checked && !to.length) setTo(['ALL']) }} /> Grade-cut situation (critical)
            </label>
          </div>
        </div>
        <NotifyPicker label="Who should get pinged" value={to} onChange={setTo} />
        <button className="btn" type="submit">Book my wake-up call</button>
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
          {w.name === me && <RemoveMine onRemove={async () => { await deleteRow('wakeup_calls', w.id); load() }} />}
        </div>
      )) : <Empty>No wake-up calls scheduled.</Empty>}
    </div>
  )
}
