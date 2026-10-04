import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { useMe } from '../identity'
import { SectionHead, Empty } from './ui'
import { pushToast } from './Toast'

const OTHER = 'Different mood'
const MOODS = ['Drinks', 'Smoking up', 'Board / card games', 'Going out', 'Movie night', 'Chilling alone', 'Open to company', OTHER]

export default function Plans() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [name, setName] = useState(me || ALL_PEOPLE[0])
  const [mood, setMood] = useState(MOODS[0])
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { if (me) setName(me) }, [me])

  async function load() { setRows(await listAll('plans', { ascending: false })) }
  useEffect(() => { load() }, [])

  const today = rows.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString())

  async function submit(e) {
    e.preventDefault()
    const finalMood = mood === OTHER ? custom.trim() : mood
    if (!finalMood) return
    await insertRow('plans', { name, mood: finalMood, note, plus_ones: [] })
    pushToast('Posted to the floor')
    setNote(''); setCustom('')
    load()
  }

  async function plusOne(row) {
    const who = me || prompt('Your name for the +1?')
    if (!who) return
    const list = row.plus_ones || []
    if (list.includes(who)) return
    await updateRow('plans', row.id, { plus_ones: [...list, who] })
    load()
  }

  return (
    <div>
      <SectionHead title="Plans & Moods" desc="Post what you're up for and see who else joins in. Pick from the list or write your own mood." />
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
        {mood === OTHER && (
          <div className="form-row">
            <div>
              <label>Your mood or plan</label>
              <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. late-night chai at the gate, main character energy" required maxLength={80} autoFocus />
            </div>
          </div>
        )}
        <div className="form-row"><div><label>Details</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. terrace, after 9pm" /></div></div>
        <button className="btn" type="submit">Post it</button>
      </form>

      {today.length ? today.map(p => (
        <div className="card" key={p.id}>
          <div className="card-top">
            <span className="card-title">{p.name}</span>
            <span className="pill blue">{p.mood}</span>
          </div>
          {p.note && <div className="card-body">{p.note}</div>}
          <div className="plusones">{(p.plus_ones || []).map(n => <span className="chip" key={n}>{n}</span>)}</div>
          <button className="btn small ghost" style={{ marginTop: 10 }} onClick={() => plusOne(p)}>
            {me && (p.plus_ones || []).includes(me) ? "You're in" : '+1 me'}
          </button>
        </div>
      )) : <Empty>No plans posted today yet.</Empty>}
    </div>
  )
}
