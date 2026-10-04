import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { listAll, insertRow, updateRow, sendPing } from '../api'
import { useMe, firstName } from '../identity'
import { SectionHead, Empty, fmtDate } from './ui'
import { NotifyPicker } from './People'
import { pushToast } from './Toast'
import MealClock from './MealClock'

const SPOTS = ['Canteen', 'Amul parlour', 'Main gate', 'Stationery shop', 'Chai tapri']

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
      body: `${firstName(me)} is heading to the ${dest.toLowerCase()}. Want anything?${note.trim() ? ' ' + note.trim() : ''}`,
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
        </div>
      )) : <Empty>No runs going right now.</Empty>}
    </>
  )
}

export default function Meals() {
  const [count, setCount] = useState(0)

  async function refreshCount() {
    const today = new Date().toISOString().slice(0, 10)
    const { count: c } = await supabase
      .from('water_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('day', today)
    setCount(c || 0)
  }

  useEffect(() => { refreshCount() }, [])

  async function logWater() {
    const { error } = await supabase.from('water_checkins').insert({ day: new Date().toISOString().slice(0, 10) })
    if (!error) { pushToast('Logged, stay hydrated'); refreshCount() }
  }

  return (
    <div>
      <SectionHead title="Mess & Water" desc="Mess timings, a running floor water tally, and chhota runs to the canteen or gate." />
      <div className="card">
        <MealClock />
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn ghost small" onClick={logWater}>I drank a glass of water</button>
          <span className="card-meta" style={{ marginTop: 0 }}>{count} glasses logged by the floor today</span>
        </div>
      </div>
      <ChhotaRun />
    </div>
  )
}
