import { useEffect, useMemo, useState } from 'react'
import { listAll, insertRow, deleteRow, sendPing } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { useMe, firstName } from '../identity'
import { computeShares, netBalances, simplifyDebts, myLine, fmtINR, toPaise, toRupees } from '../split'
import { SectionHead, Empty, fmtDate } from './ui'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'

const QUICK = ['Blinkit run', 'Chhota run', 'Cake', 'Cab', 'Water cans', 'Decor']

export default function SplitTab() {
  const me = useMe()
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [mode, setMode] = useState(null) // 'expense' | 'payment' | null
  const [showAll, setShowAll] = useState(false)

  async function load() {
    const [e, s] = await Promise.all([listAll('expenses', { ascending: false }), listAll('settlements', { ascending: false })])
    setExpenses(e); setSettlements(s)
  }
  useEffect(() => { load() }, [])

  const bal = useMemo(() => netBalances(expenses, settlements), [expenses, settlements])
  const debts = useMemo(() => simplifyDebts(bal), [bal])
  const mine = me ? debts.filter(d => d.from === me || d.to === me) : []
  const myNet = me ? toRupees(bal[me] || 0) : 0

  async function settle(d) {
    await insertRow('settlements', { from_name: d.from, to_name: d.to, amount: d.amount, created_by: me })
    await sendPing({
      from: me, recipients: [d.from === me ? d.to : d.from], kind: 'tab',
      title: 'Settle Up', body: `${firstName(d.from)} paid ${firstName(d.to)} ${fmtINR(d.amount)}. Marked as settled.`,
    })
    pushToast('Settled up')
    load()
  }

  async function remind(d) {
    await sendPing({ from: me, recipients: [d.from], kind: 'tab', title: 'Settle Up', body: `Friendly nudge: you owe ${firstName(d.to)} ${fmtINR(d.amount)}.` })
    pushToast(`Nudged ${firstName(d.from)}`)
  }

  async function remove(table, id) {
    if (!confirm('Delete this from Settle Up for everyone?')) return
    await deleteRow(table, id)
    load()
  }

  const activity = [
    ...expenses.map(e => ({ ...e, _kind: 'expense' })),
    ...settlements.map(s => ({ ...s, _kind: 'payment' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 40)

  return (
    <div>
      <SectionHead title="Settle Up" desc="Splitwise for the floor. Log who paid and who it's split with, and the app works out who owes whom in the fewest payments." />

      <div className={`card tab-summary ${myNet > 0 ? 'owed' : myNet < 0 ? 'owes' : ''}`}>
        {!me ? (
          <div className="card-body">Check in with your name above to see what you owe and are owed.</div>
        ) : (
          <>
            <div className="tab-big-label">{myNet > 0 ? 'You are owed' : myNet < 0 ? 'You owe' : 'All settled up'}</div>
            {myNet !== 0 && <div className="tab-big">{fmtINR(myNet)}</div>}
            {mine.map(d => (
              <div className="debt-row" key={d.from + d.to}>
                <span>{d.from === me
                  ? <>You owe <strong>{firstName(d.to)}</strong> {fmtINR(d.amount)}</>
                  : <><strong>{firstName(d.from)}</strong> owes you {fmtINR(d.amount)}</>}
                </span>
                {d.from === me
                  ? <button className="btn small" onClick={() => settle(d)}>Settle up</button>
                  : <span className="debt-actions">
                      <button className="btn small ghost" onClick={() => remind(d)}>Nudge</button>
                      <button className="btn small ghost" onClick={() => settle(d)}>Mark paid</button>
                    </span>}
              </div>
            ))}
          </>
        )}
        <div className="tab-actions">
          <button className="btn" onClick={() => setMode(mode === 'expense' ? null : 'expense')}>Add an expense</button>
          <button className="btn ghost" onClick={() => setMode(mode === 'payment' ? null : 'payment')}>Record a payment</button>
        </div>
      </div>

      {mode === 'expense' && <ExpenseForm me={me} onDone={() => { setMode(null); load() }} />}
      {mode === 'payment' && <PaymentForm me={me} onDone={() => { setMode(null); load() }} />}

      <div className="subhead-row">
        <h3 className="subhead">Floor balances</h3>
        <button className="link-btn" onClick={() => setShowAll(s => !s)}>{showAll ? 'Simplified' : 'Per person'}</button>
      </div>
      {showAll ? (
        Object.keys(bal).length ? (
          <div className="card">
            {Object.entries(bal).sort((a, b) => b[1] - a[1]).map(([p, v]) => (
              <div className="bal-row" key={p}>
                <span>{p}</span>
                <span className={v > 0 ? 'pos' : 'neg'}>{v > 0 ? 'gets back ' : 'owes '}{fmtINR(toRupees(v))}</span>
              </div>
            ))}
          </div>
        ) : <Empty>Everyone's square.</Empty>
      ) : debts.length ? (
        <div className="card">
          {debts.map(d => (
            <div className="bal-row" key={d.from + d.to}>
              <span><strong>{firstName(d.from)}</strong> pays <strong>{firstName(d.to)}</strong></span>
              <span className="neg">{fmtINR(d.amount)}</span>
            </div>
          ))}
        </div>
      ) : <Empty>Everyone's square.</Empty>}

      <h3 className="subhead">Activity</h3>
      {activity.length ? activity.map(a => a._kind === 'expense' ? (
        <ExpenseCard key={a.id} e={a} me={me} onDelete={() => remove('expenses', a.id)} />
      ) : (
        <div className="card" key={a.id}>
          <div className="card-top">
            <span className="card-title">{firstName(a.from_name)} paid {firstName(a.to_name)}</span>
            <span className="tab-amt">{fmtINR(a.amount)}</span>
          </div>
          <div className="card-meta">Payment · {fmtDate(a.created_at)}</div>
          <button className="link-btn danger" onClick={() => remove('settlements', a.id)}>Delete</button>
        </div>
      )) : <Empty>No expenses yet. Add the first one.</Empty>}
    </div>
  )
}

function ExpenseCard({ e, me, onDelete }) {
  const line = myLine(e, me)
  const n = Object.keys(e.shares || {}).length
  return (
    <div className="card">
      <div className="card-top">
        <span className="card-title">{e.description}</span>
        <span className="tab-amt">{fmtINR(e.amount)}</span>
      </div>
      <div className="card-meta">{firstName(e.paid_by)} paid · split {e.split_type === 'equal' ? `equally, ${n} ways` : `by ${e.split_type === 'exact' ? 'exact amounts' : 'percentage'}`} · {fmtDate(e.created_at)}</div>
      <div className="card-body">
        {line ? <span className={line.kind === 'lent' ? 'pos' : 'neg'}>{line.kind === 'lent' ? `You lent ${fmtINR(line.amount)}` : `You owe ${fmtINR(line.amount)}`}</span> : <span className="card-meta">Not involved</span>}
      </div>
      <details className="shares">
        <summary>Who owes what</summary>
        {Object.entries(e.shares || {}).map(([p, v]) => <div key={p} className="bal-row"><span>{p}</span><span>{fmtINR(v)}</span></div>)}
      </details>
      <button className="link-btn danger" onClick={onDelete}>Delete</button>
    </div>
  )
}

function ExpenseForm({ me, onDone }) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(me || ALL_PEOPLE[0])
  const [people, setPeople] = useState(me ? [me] : [])
  const [type, setType] = useState('equal')
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState(false)

  const between = people.includes('ALL') ? ALL_PEOPLE : people
  const { shares, error } = computeShares(amount, between, type, inputs)

  const assigned = type === 'exact'
    ? between.reduce((s, p) => s + toPaise(inputs[p]), 0) / 100
    : between.reduce((s, p) => s + Number(inputs[p] || 0), 0)

  async function save(ev) {
    ev.preventDefault()
    if (error || !desc.trim()) return
    setSaving(true)
    await insertRow('expenses', { description: desc.trim(), amount: Number(amount), paid_by: paidBy, split_type: type, shares, created_by: me })
    const others = Object.keys(shares).filter(p => p !== me)
    await Promise.all(others.map(p => sendPing({
      from: me, recipients: [p], kind: 'tab', title: 'Settle Up',
      body: `${firstName(me || paidBy)} added "${desc.trim()}" (${fmtINR(amount)}). ${p === paidBy ? `You paid, you get back ${fmtINR(Number(amount) - (shares[p] || 0))}.` : `Your share: ${fmtINR(shares[p])}.`}`,
    })))
    pushToast('Added to Settle Up')
    onDone()
  }

  return (
    <form className="inline-form" onSubmit={save}>
      <div className="form-row">
        <div>
          <label>What was it for</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Blinkit run, Tuesday night" required />
          <div className="quick-chips">{QUICK.map(q => <button type="button" key={q} className="np-chip" onClick={() => setDesc(q)}>{q}</button>)}</div>
        </div>
      </div>
      <div className="form-row">
        <div><label>Amount (₹)</label><input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required /></div>
        <div>
          <label>Paid by</label>
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>{ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}</select>
        </div>
      </div>
      <NotifyPicker label="Split between" value={people} onChange={setPeople} />
      <div className="seg" role="tablist" aria-label="How to split">
        {[['equal', 'Equally'], ['exact', 'Exact ₹'], ['percent', 'Percent']].map(([k, l]) => (
          <button type="button" role="tab" key={k} aria-selected={type === k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>
        ))}
      </div>
      {between.length > 0 && (
        <div className="split-list">
          {between.map(p => (
            <div className="split-row" key={p}>
              <span>{p}</span>
              {type === 'equal'
                ? <span className="split-val">{shares[p] !== undefined ? fmtINR(shares[p]) : '–'}</span>
                : <span className="split-input">
                    {type === 'exact' && <span>₹</span>}
                    <input type="number" inputMode="decimal" min="0" step="0.01" aria-label={`${p} ${type === 'exact' ? 'amount' : 'percent'}`}
                      value={inputs[p] ?? ''} onChange={e => setInputs(i => ({ ...i, [p]: e.target.value }))} />
                    {type === 'percent' && <span>%</span>}
                  </span>}
            </div>
          ))}
          {type !== 'equal' && (
            <div className="split-total">{type === 'exact' ? `${fmtINR(assigned)} of ${fmtINR(amount || 0)}` : `${+assigned.toFixed(2)}% of 100%`}</div>
          )}
        </div>
      )}
      {error && amount && <div className="form-error" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={!!error || saving}>Save expense</button>
    </form>
  )
}

function PaymentForm({ me, onDone }) {
  const [from, setFrom] = useState(me || ALL_PEOPLE[0])
  const [to, setTo] = useState(ALL_PEOPLE.find(p => p !== (me || ALL_PEOPLE[0])))
  const [amount, setAmount] = useState('')

  async function save(ev) {
    ev.preventDefault()
    if (!(Number(amount) > 0) || from === to) return
    await insertRow('settlements', { from_name: from, to_name: to, amount: Number(amount), created_by: me })
    const other = from === me ? to : from
    await sendPing({ from: me, recipients: [other], kind: 'tab', title: 'Settle Up', body: `${firstName(from)} paid ${firstName(to)} ${fmtINR(amount)}.` })
    pushToast('Payment recorded')
    onDone()
  }

  return (
    <form className="inline-form" onSubmit={save}>
      <div className="form-row">
        <div><label>Who paid</label><select value={from} onChange={e => setFrom(e.target.value)}>{ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}</select></div>
        <div><label>Paid to</label><select value={to} onChange={e => setTo(e.target.value)}>{ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}</select></div>
        <div><label>Amount (₹)</label><input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></div>
      </div>
      {from === to && <div className="form-error" role="alert">Pick two different people.</div>}
      <button className="btn" type="submit" disabled={from === to}>Record payment</button>
    </form>
  )
}
