import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow, deleteRow, sendPing } from '../api'
import { useMe, firstName } from '../identity'
import { SectionHead, Empty, fmtDate, RemoveMine } from './ui'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'
import MealClock from './MealClock'
import MessMenu from './MessMenu'

const SPOTS = ['Chhota canteen', 'MICAfe', 'Main gate', 'Stationery shop', 'Chai tapri outside']

function ChhotaRun() {
  const me = useMe()
  const [runs, setRuns] = useState([])
  const [dest, setDest] = useState(SPOTS[0])
  const [note, setNote] = useState('')
  const [to, setTo] = useState([])
  const [asks, setAsks] = useState({})

  async function load() {
    const all = await listAll('chhota_runs', { ascending: false })
    const cutoff = Date.now() - 12 * 3600 * 1000
    setRuns(all.filter(r => new Date(r.created_at).getTime() > cutoff))
  }
  useEffect(() => { load() }, [])

  async function post(e) {
    e.preventDefault()
    if (!me) return pushToast('Check in with your name first')
    await insertRow('chhota_runs', { name: me, destination: dest, note, recipients: to })
    await sendPing({
      from: me, recipients: to, kind: 'chhota', title: 'Chhota run?',
      body: `${firstName(me)} is heading to ${dest}. Want anything?${note.trim() ? ' ' + note.trim() : ''}`,
    })
    pushToast(to.length ? 'Run posted and pinged' : 'Run posted')
    setNote(''); setTo([])
    load()
  }

  async function ask(run) {
    const item = (asks[run.id] || '').trim()
    if (!item || !me) return
    const line = `${firstName(me)}: ${item}`
    await updateRow('chhota_runs', run.id, { asks: [...(run.asks || []), line] })
    if (run.name !== me) await sendPing({ from: me, recipients: [run.name], kind: 'chhota', title: 'Chhota run', body: `${firstName(me)} wants ${item}` })
    setAsks(a => ({ ...a, [run.id]: '' }))
    load()
  }

  return (
    <>
      <h3 className="subhead">Chhota run?</h3>
      <form className="inline-form" onSubmit={post}>
        <p className="form-hint">Popping out for something small? Ask if anyone wants anything.</p>
        <div className="form-row">
          <div>
            <label>Going to</label>
            <select value={dest} onChange={e => setDest(e.target.value)}>{SPOTS.map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <div><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="leaving in 5, back by 9:30" /></div>
        </div>
        <NotifyPicker label="Who to ping" value={to} onChange={setTo} exclude={me ? [me] : []} />
        <button className="btn" type="submit">Post the run</button>
      </form>

      {runs.length ? runs.map(r => (
        <div className="card" key={r.id}>
          <div className="card-top">
            <span className="card-title">{firstName(r.name)} → {r.destination}</span>
            <span className="card-meta">{fmtDate(r.created_at)}</span>
          </div>
          {r.note && <div className="card-body">{r.note}</div>}
          {(r.asks || []).length > 0 && <div className="plusones">{r.asks.map((a, i) => <span className="chip" key={i}>{a}</span>)}</div>}
          {me && (
            <div className="inline-ask">
              <input aria-label="What do you want from this run" value={asks[r.id] || ''} onChange={e => setAsks(a => ({ ...a, [r.id]: e.target.value }))} placeholder="Get me a Kitkat" />
              <button className="btn small ghost" type="button" onClick={() => ask(r)}>Ask</button>
            </div>
          )}
          {r.name === me && <div><RemoveMine onRemove={async () => { await deleteRow('chhota_runs', r.id); load() }} /></div>}
        </div>
      )) : <Empty>No runs going right now.</Empty>}
    </>
  )
}

export default function Meals() {
  return (
    <div>
      <SectionHead title="Meal Plans" desc="This week's mess menu, mess timings, and chhota runs to the canteen, MICAfe or the chai tapri." />
      <MessMenu />
      <h3 className="subhead">Mess timings</h3>
      <div className="card"><MealClock /></div>
      <ChhotaRun />
    </div>
  )
}
