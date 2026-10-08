import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow, deleteRow, sendPing } from '../api'
import { useMe, firstName } from '../identity'
import { PostingAs } from './People'
import { SectionHead, Empty, RemoveMine } from './ui'
import { pushToast } from './Toast'

const OTHER = 'Different mood'
const MOODS = ['Drinks', 'Smoking up', 'Board / card games', 'Going out', 'Movie night', 'Chilling alone', 'Open to company', 'Do Not Disturb', OTHER]

export default function Plans() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [mood, setMood] = useState(MOODS[0])
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')

  async function load() { setRows(await listAll('plans', { ascending: false })) }
  useEffect(() => { load() }, [])

  const today = rows.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString())

  async function submit(e) {
    e.preventDefault()
    const finalMood = mood === OTHER ? custom.trim() : mood
    if (!finalMood) return
    await insertRow('plans', { name: me, mood: finalMood, note, plus_ones: [] })
    await sendPing({
      from: me, recipients: ['ALL'], kind: 'plan', title: `Plan: ${finalMood}`,
      body: `${me ? firstName(me) : 'Someone'} is up for ${finalMood.toLowerCase()}${note.trim() ? ` (${note.trim()})` : ''}. Open Plans to +1.`,
    })
    pushToast('Posted and the floor was pinged')
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
      <SectionHead title="Plans & Moods" desc="Post what you're up for and see who else joins in. Posting pings everyone on the floor." />
      <form className="inline-form" onSubmit={submit}>
        <PostingAs />
        <div className="form-row">
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
          {p.name === me && <div><RemoveMine onRemove={async () => { await deleteRow('plans', p.id); load() }} /></div>}
        </div>
      )) : <Empty>No plans posted today yet.</Empty>}
    </div>
  )
}
