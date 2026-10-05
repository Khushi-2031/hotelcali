import { useEffect, useState } from 'react'
import { listAll, insertRow } from '../api'
import { SectionHead, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'
import { PostingAs } from './People'
import { useMe } from '../identity'

export default function AdminAlert({ onChange }) {
  const [rows, setRows] = useState([])
  const name = useMe()
  const [message, setMessage] = useState('')

  async function load() { setRows(await listAll('admin_alerts', { ascending: false })) }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!message.trim()) return
    const ok = confirm('This pushes a notification to everyone on the floor right now. Send it?')
    if (!ok) return
    await insertRow('admin_alerts', { name, message })
    pushToast('Alert sent to everyone')
    setMessage('')
    load()
    onChange && onChange()
  }

  return (
    <div>
      <SectionHead
        title="Admin Alert"
        desc="For anything urgent enough that the whole floor needs to know right now. This pushes a notification to everyone who has notifications enabled and shows a banner across the app for 30 minutes."
      />
      <form className="inline-form" onSubmit={submit}>
        <PostingAs />
        <div className="form-row">
          <div><label>Alert message</label><input value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. water's shut off floor-wide till 6pm" required /></div>
        </div>
        <button className="btn" type="submit">Send alert to everyone</button>
      </form>

      <h3 className="subhead">Recent alerts</h3>
      {rows.length ? rows.slice(0, 15).map(r => (
        <div className="card critical" key={r.id}>
          <div className="card-top"><span className="card-title">{r.message}</span></div>
          <div className="card-meta">{r.name} · {fmtDate(r.created_at)}</div>
        </div>
      )) : <Empty>No alerts sent yet.</Empty>}
    </div>
  )
}
