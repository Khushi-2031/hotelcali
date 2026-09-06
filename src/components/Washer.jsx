import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { SectionHead, Pill, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'

export default function Washer() {
  const [rows, setRows] = useState([])
  const [name, setName] = useState(ALL_PEOPLE[0])
  const [dur, setDur] = useState(45)

  async function load() { setRows(await listAll('washer_log', { ascending: false })) }
  useEffect(() => { load() }, [])

  const current = rows[0]
  const busy = current && !current.done

  async function claim() {
    await insertRow('washer_log', { name, duration: Number(dur), done: false })
    pushToast('Machine claimed')
    load()
  }
  async function free() {
    await updateRow('washer_log', current.id, { done: true })
    pushToast('Machine freed up')
    load()
  }

  return (
    <div>
      <SectionHead title="Washing machine" desc="Claim it when you start a load, free it up when you're done — so no one shows up to a machine mid-cycle." />
      <div className="card">
        <div className="card-top">
          <span className="card-title">{busy ? `In use — ${current.name}` : 'Free'}</span>
          {busy ? <Pill tone="blue">Running</Pill> : <Pill tone="teal">Available</Pill>}
        </div>
        {busy && <div className="card-meta">Started {fmtDate(current.created_at)}{current.duration ? ` · about ${current.duration} min` : ''}</div>}
        <div style={{ marginTop: 10 }}>
          {busy ? (
            <button className="btn small" onClick={free}>Mark finished & free it up</button>
          ) : (
            <>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div>
                  <label>Your name</label>
                  <select value={name} onChange={e => setName(e.target.value)}>
                    {ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label>Expected duration (min)</label><input type="number" min="10" value={dur} onChange={e => setDur(e.target.value)} /></div>
              </div>
              <button className="btn small" onClick={claim}>Claim the machine</button>
            </>
          )}
        </div>
      </div>
      <h3 className="subhead">Recent loads</h3>
      {rows.length ? rows.slice(0, 8).map(w => (
        <div className="card" key={w.id}>
          <div className="card-top"><span className="card-title">{w.name}</span>{w.done ? <Pill tone="teal">Done</Pill> : <Pill tone="blue">Running</Pill>}</div>
          <div className="card-meta">{fmtDate(w.created_at)}</div>
        </div>
      )) : <Empty>No loads logged yet.</Empty>}
    </div>
  )
}
