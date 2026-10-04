import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { SectionHead, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'

const MOODS = ['Drinks', 'Smoking up', 'Board / card games', 'Going out', 'Movie night', 'Chilling alone', 'Open to company']

export default function Plans() {
  const [rows, setRows] = useState([])
  const [name, setName] = useState(ALL_PEOPLE[0])
  const [mood, setMood] = useState(MOODS[0])
  const [note, setNote] = useState('')

  async function load() { setRows(await listAll('plans', { ascending: false })) }
  useEffect(() => { load() }, [])

  const today = rows.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString())

  async function submit(e) {
    e.preventDefault()
    await insertRow('plans', { name, mood, note, plus_ones: [] })
    pushToast('Posted to the floor')
    setNote('')
    load()
  }

  async function plusOne(row) {
    const who = prompt('Your name for the +1?')
    if (!who) return
    const list = row.plus_ones || []
    if (!list.includes(who)) list.push(who)
    await updateRow('plans', row.id, { plus_ones: list })
    load()
  }

  return (
    <div>
      <SectionHead title="Plans & Moods" desc="Post what you're up for and see who else joins in — drinks, cards, a movie, an outing, or just company while you chill." />
      <form className="inline-form" onSubmit={submit}>
        <div className="form-row">
          <div>
            <label>Your name</label>
            <select value={name} onChange={e => setName(e.target.value)}>
              {ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label>What's the mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)}>
              {MOODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row"><div><label>Details</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. terrace, after 9pm" /></div></div>
        <button className="btn" type="submit">Post it</button>
      </form>

      {today.length ? today.map(p => (
        <div className="card" key={p.id}>
          <div className="card-top"><span className="card-title">{p.name} is feeling like {p.mood.toLowerCase()}!</span></div>
          {p.note && <div className="card-body">{p.note}</div>}
          <div className="plusones">{(p.plus_ones || []).map(n => <span className="chip" key={n}>{n}</span>)}</div>
          <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => plusOne(p)}>+1 me</button>
        </div>
      )) : <Empty>No plans posted today yet.</Empty>}
    </div>
  )
}
