import { useEffect, useState } from 'react'
import { listAll, insertRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { SectionHead, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'

export default function FloorFund() {
  const [rows, setRows] = useState([])
  const [name, setName] = useState(ALL_PEOPLE[0])
  const [preset, setPreset] = useState('800')
  const [amount, setAmount] = useState(800)
  const [note, setNote] = useState('')

  async function load() { setRows(await listAll('floor_fund', { ascending: false })) }
  useEffect(() => { load() }, [])

  const totals = {}
  rows.forEach(r => { totals[r.name] = (totals[r.name] || 0) + Number(r.amount) })
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const max = sorted.length ? sorted[0][1] : 1

  async function submit(e) {
    e.preventDefault()
    await insertRow('floor_fund', { name, amount: Number(amount), note })
    pushToast('Contribution logged')
    setNote('')
    load()
  }

  return (
    <div>
      <SectionHead
        title="Tip Jar"
        desc={<>Log a pooled purchase and who fronted the cash, so splitting later isn't a guessing game. Packet sizes default to ₹800 / ₹2000 but the amount is always editable.
          <br /><br /><em style={{ color: 'var(--text-lo)' }}>This tracks money contributed to shared floor purchases, not a personal usage log — it's about splitting costs fairly rather than ranking anyone's consumption.</em></>}
      />
      <form className="inline-form" onSubmit={submit}>
        <div className="form-row">
          <div>
            <label>Paid by</label>
            <select value={name} onChange={e => setName(e.target.value)}>
              {ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label>Packet size</label>
            <select value={preset} onChange={e => { setPreset(e.target.value); if (e.target.value !== 'custom') setAmount(e.target.value) }}>
              <option value="800">₹800</option>
              <option value="2000">₹2000</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label>Amount (₹)</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="what it was for, optional" /></div>
        </div>
        <button className="btn" type="submit">Log contribution</button>
      </form>

      <h3 className="subhead">Contributions by person</h3>
      {sorted.length ? sorted.map(([n, amt]) => (
        <div className="bar-wrap" key={n}>
          <div className="bar-name">{n}</div>
          <div className="bar-track"><div className="bar-fill blue" style={{ width: `${(amt / max) * 100}%` }} /></div>
          <div className="bar-val">₹{amt}</div>
        </div>
      )) : <Empty>No contributions logged yet.</Empty>}

      <h3 className="subhead">Recent activity</h3>
      {rows.slice(0, 15).map(r => (
        <div className="card" key={r.id}>
          <div className="card-top"><span className="card-title">{r.name} · ₹{r.amount}</span></div>
          <div className="card-meta">{fmtDate(r.created_at)}</div>
          {r.note && <div className="card-body">{r.note}</div>}
        </div>
      ))}
    </div>
  )
}
