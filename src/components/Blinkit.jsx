import { useState } from 'react'
import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'
import { sendPing } from '../api'
import { useMe, firstName } from '../identity'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'

function OrderingNow({ go }) {
  const me = useMe()
  const [to, setTo] = useState(['ALL'])
  const [when, setWhen] = useState('in 10 min')
  const [extra, setExtra] = useState('')
  const [sent, setSent] = useState(false)

  async function send(e) {
    e.preventDefault()
    if (!to.length) return
    await sendPing({
      from: me, recipients: to, kind: 'blinkit', title: 'Blinkit run',
      body: `${me ? firstName(me) : 'Someone'} is ordering from Blinkit ${when}. Want to club your order?${extra.trim() ? ' ' + extra.trim() : ''}`,
    })
    pushToast('Pinged')
    setSent(true); setExtra('')
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <form className="inline-form ordering-now" onSubmit={send}>
      <h3 className="form-title">Ordering right now?</h3>
      <p className="form-hint">Ping people so they can club their order with yours.</p>
      <div className="form-row">
        <div>
          <label>When</label>
          <select value={when} onChange={e => setWhen(e.target.value)}>
            {['right now', 'in 10 min', 'in 30 min', 'in an hour'].map(w => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div><label>Add a line (optional)</label><input value={extra} onChange={e => setExtra(e.target.value)} placeholder="Free delivery above ₹199" /></div>
      </div>
      <NotifyPicker label="Who to ping" value={to} onChange={setTo} exclude={me ? [me] : []} />
      <button className="btn" type="submit" disabled={!to.length}>{sent ? 'Pinged!' : 'Ping them'}</button>
      <p className="form-hint" style={{ marginTop: 14 }}>
        Splitting the bill? <button type="button" className="link-btn" onClick={() => go && go('split')}>Log it in Settle Up</button>
      </p>
    </form>
  )
}

export default function Blinkit({ go }) {
  const me = useMe()
  return (
    <ListModule
        table="blinkit_orders"
        title="Room Service"
        desc="Drop what you need into the current run. One or two floor-wide orders go out each day. Mark it received once it lands."
        fields={[
          { name: 'name', type: 'me' },
          { name: 'item', label: 'Item(s)', type: 'text', placeholder: 'Maggi x4, ice cream tub', required: true },
          { name: 'run', label: 'Order run', type: 'select', options: ['Morning run', 'Evening run'] },
        ]}
        resolveField="done"
        resolveLabel="Mark delivered"
        doneLabel="Delivered"
        renderCard={row => ({
          title: row.item,
          pill: <Pill tone="blue">{row.run}</Pill>,
          meta: `${row.name} · ${fmtDate(row.created_at)}`,
          body: row.notes,
        })}
        formTitle="Add to the run"
      >
        <OrderingNow go={go} />
      </ListModule>
  )
}
