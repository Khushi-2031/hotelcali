import { useState } from 'react'
import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'
import { sendPing, insertRow } from '../api'
import { useMe, firstName, isGuest } from '../identity'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'
import { computeShares, fmtINR } from '../split'

// Step 1: what you're ordering and for how much. Step 2: who to ping.
// Step 3 (optional tick): also add it to Settle Up, split equally.
function OrderingNow() {
  const me = useMe()
  const [items, setItems] = useState('')
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState('right now')
  const [extra, setExtra] = useState('')
  const [to, setTo] = useState(['ALL'])
  const [logSplit, setLogSplit] = useState(false)
  const [splitWith, setSplitWith] = useState(me ? [me] : [])
  const [busy, setBusy] = useState(false)

  const people = splitWith.filter(Boolean)
  const { shares, error } = logSplit ? computeShares(amount, people, 'equal') : { shares: {}, error: null }
  const amt = Number(amount)
  const canSave = items.trim() && !busy && (!logSplit || (!error && amt > 0 && me))

  function toggleSplit(p) {
    setSplitWith(list => list.includes(p) ? list.filter(x => x !== p) : [...list, p])
  }

  async function save(e) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      const what = items.trim()
      await insertRow('blinkit_orders', {
        name: me, item: what, run: 'Blinkit run', done: false,
        notes: [amt > 0 ? fmtINR(amt) : null, `ordering ${when}`, extra.trim() || null].filter(Boolean).join(' · '),
      })
      if (to.length) {
        await sendPing({
          from: me, recipients: to, kind: 'blinkit', title: 'Blinkit run',
          body: `${me ? firstName(me) : 'Someone'} is ordering from Blinkit ${when}: ${what}${amt > 0 ? ` (${fmtINR(amt)})` : ''}. Want to add something?${extra.trim() ? ' ' + extra.trim() : ''}`,
        })
      }
      if (logSplit) {
        await insertRow('expenses', { description: `Blinkit: ${what}`.slice(0, 120), amount: amt, paid_by: me, split_type: 'equal', shares, created_by: me })
        const others = Object.keys(shares).filter(p => p !== me)
        await Promise.all(others.map(p => sendPing({
          from: me, recipients: [p], kind: 'tab', title: 'Settle Up',
          body: `${firstName(me)} added a Blinkit run (${fmtINR(amt)}). Your share: ${fmtINR(shares[p])}.`,
        })))
      }
      pushToast(logSplit ? 'Run logged and added to Settle Up' : to.length ? 'Run logged, people pinged' : 'Run logged')
      setItems(''); setAmount(''); setExtra(''); setLogSplit(false); setSplitWith(me ? [me] : [])
      window.dispatchEvent(new Event('hc-blinkit-refresh'))
    } catch {
      pushToast('Could not save, try again')
    } finally { setBusy(false) }
  }

  if (isGuest(me)) return null

  return (
    <form className="inline-form ordering-now" onSubmit={save}>
      <h3 className="form-title">Log a Blinkit run</h3>
      <p className="form-hint">What you're ordering and how much. Ping people so they can add to it.</p>
      <div className="form-row">
        <div><label>What's in it</label><input value={items} onChange={e => setItems(e.target.value)} placeholder="Maggi x4, Coke, ice cream tub" required /></div>
        <div><label>Amount (₹)</label><input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="450" /></div>
      </div>
      <div className="form-row">
        <div>
          <label>When</label>
          <select value={when} onChange={e => setWhen(e.target.value)}>
            {['right now', 'in 10 min', 'in 30 min', 'in an hour'].map(w => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div><label>Add a line (optional)</label><input value={extra} onChange={e => setExtra(e.target.value)} placeholder="Free delivery above ₹199" /></div>
      </div>
      <NotifyPicker label="Send a notification to" value={to} onChange={setTo} exclude={me ? [me] : []} />
      <p className="form-hint" style={{ marginTop: -4 }}>Tap Everyone off and pick names to ping only some people, or clear it to ping nobody.</p>

      <label className="remember" style={{ marginTop: 4, marginBottom: 12 }}>
        <input type="checkbox" checked={logSplit} onChange={e => setLogSplit(e.target.checked)} />
        <span>Also log it as an expense in Settle Up (you paid, split equally)</span>
      </label>

      {logSplit && (
        <div className="notify-picker">
          <div className="np-head">
            <label>Split between</label>
            <span className="np-count">{people.length ? `${people.length} people` : 'Nobody yet'}</span>
          </div>
          <div className="np-chips">
            {ALL_PEOPLE.map(p => (
              <button type="button" key={p} className={`np-chip ${people.includes(p) ? 'on' : ''}`} aria-pressed={people.includes(p)} onClick={() => toggleSplit(p)}>
                {p === me ? 'Me' : firstName(p)}
              </button>
            ))}
          </div>
          {amt > 0 && !error && <p className="form-hint" style={{ marginTop: 8 }}>{fmtINR(Object.values(shares)[0] || 0)} each{people.length > 1 ? `, ${people.length} ways` : ''}.</p>}
          {amount && error && <div className="form-error" role="alert">{error}</div>}
          {!(amt > 0) && <p className="form-hint" style={{ marginTop: 8 }}>Add the amount above to split it.</p>}
        </div>
      )}

      <button className="btn" type="submit" disabled={!canSave}>
        {busy ? 'Saving…' : logSplit ? 'Log run and add to Settle Up' : to.length ? 'Log run and ping' : 'Log run'}
      </button>
    </form>
  )
}

export default function Blinkit() {
  return (
    <ListModule
        table="blinkit_orders"
        refreshEvent="hc-blinkit-refresh"
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
        <OrderingNow />
      </ListModule>
  )
}
