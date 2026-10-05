import { useEffect, useState } from 'react'
import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'
import { listAll, insertRow, sendPing } from '../api'
import { useMe, firstName, SPC_REPS } from '../identity'
import { SectionHead, Empty } from './ui'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'

const TO_REP = { Vismay: ['Vismay Bhatt'], Simran: ['Simran Gupta'], Either: SPC_REPS }

function FromSpc() {
  const me = useMe()
  const isRep = SPC_REPS.includes(me)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [to, setTo] = useState(['ALL'])

  async function load() { setRows(await listAll('spc_broadcasts', { ascending: false })) }
  useEffect(() => { load() }, [])

  async function send(e) {
    e.preventDefault()
    if (!msg.trim() || !to.length) return
    await insertRow('spc_broadcasts', { name: me, recipients: to, message: msg.trim() })
    await sendPing({ from: me, recipients: to, kind: 'spc', title: `SPC Desk: ${firstName(me)}`, body: msg.trim() })
    pushToast('Sent')
    setMsg('')
    load()
  }

  const visible = rows.filter(r => isRep || (r.recipients || []).includes('ALL') || (r.recipients || []).includes(me)).slice(0, 15)

  return (
    <>
      <h3 className="subhead">From the SPC reps</h3>
      {isRep && (
        <form className="inline-form" onSubmit={send}>
          <p className="form-hint">You're an SPC rep. Ask specific people or the whole floor for anything: forms, signatures, attendance, feedback.</p>
          <div className="form-row">
            <div><label>Message</label><textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="e.g. Fill the mess feedback form by Friday" required /></div>
          </div>
          <NotifyPicker label="Send to" value={to} onChange={setTo} exclude={[me]} />
          <button className="btn" type="submit" disabled={!to.length}>Send from the SPC desk</button>
        </form>
      )}
      {visible.length ? visible.map(r => (
        <div className="card" key={r.id}>
          <div className="card-top">
            <span className="card-title">{r.message}</span>
            <Pill tone="blue">{(r.recipients || []).includes('ALL') ? 'Everyone' : 'For you'}</Pill>
          </div>
          <div className="card-meta">{r.name} · {fmtDate(r.created_at)}{isRep && !(r.recipients || []).includes('ALL') ? ` · to ${(r.recipients || []).map(firstName).join(', ')}` : ''}</div>
        </div>
      )) : <Empty>Nothing from the SPC reps yet.</Empty>}
    </>
  )
}

export default function Spc() {
  const me = useMe()
  return (
    <div>
      <SectionHead title="SPC Desk" desc="Vismay and Simran are the floor's SPC reps. Messages from them up top, your requests to them below." />
      <FromSpc />
      <h3 className="subhead">Requests to the SPC reps</h3>
      <ListModule
        table="spc_requests"
        fields={[
          { name: 'name', type: 'me' },
          { name: 'to_person', label: 'Addressed to', type: 'select', options: ['Either', 'Vismay', 'Simran'] },
          { name: 'details', label: 'Request', type: 'textarea', required: true },
        ]}
        submitLabel="Send to SPC"
        onPosted={row => sendPing({
          from: row.name, recipients: TO_REP[row.to_person] || SPC_REPS, kind: 'spc',
          title: 'New SPC request', body: `${firstName(row.name)}: ${row.details}`,
        })}
        resolveField="resolved"
        resolveLabel="Mark handled"
        doneLabel="Handled"
        renderCard={row => ({
          title: `For ${row.to_person}`,
          pill: !row.resolved ? <Pill tone="blue">Open</Pill> : null,
          meta: `${row.name} · ${fmtDate(row.created_at)}`,
          body: row.details,
        })}
      />
    </div>
  )
}
