import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { listAll } from '../api'
import { useMe, firstName } from '../identity'
import { pushToast } from './Toast'

export const DAILY_MOODS = [
  { label: 'Chill', tone: 'blue' },
  { label: 'Session', tone: 'navy' },
  { label: 'Party', tone: 'red' },
  { label: 'To go out', tone: 'sun' },
  { label: 'Slow day', tone: 'mint' },
  { label: 'Resting', tone: 'cloud' },
  { label: 'Angry', tone: 'crimson' },
  { label: 'Do Not Disturb', tone: 'ink' },
]

const toneOf = (mood) => DAILY_MOODS.find(m => m.label === mood)?.tone || 'blue'
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Everyone logs one mood a day. Today's moods float on the Front Desk.
 */
export default function DailyMood() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  async function load() {
    const all = await listAll('mood_logs', { ascending: false })
    setRows(all.filter(r => r.day === today()))
  }
  useEffect(() => { load() }, [])

  const mine = rows.find(r => r.name === me)

  async function pick(mood) {
    if (!me || !mood.trim()) return
    const { error } = await supabase.from('mood_logs').upsert(
      { name: me, day: today(), mood: mood.trim(), created_at: new Date().toISOString() },
      { onConflict: 'name,day' },
    )
    if (error) { console.error(error); pushToast("Couldn't save your mood"); return }
    pushToast('Mood logged for today')
    setShowCustom(false); setCustom('')
    load()
  }

  // Scatter bubbles in a loose grid so they don't pile up, then let CSS float them.
  const bubbles = rows.map((r, i) => {
    const cols = 3
    const col = i % cols, row = Math.floor(i / cols)
    const jitter = ((i * 37) % 11) - 5
    return {
      ...r,
      style: {
        left: `${6 + col * 31 + jitter / 2}%`,
        top: `${10 + row * 64 + ((i * 53) % 18)}px`,
        animationDelay: `${(i * 0.7) % 4}s`,
        animationDuration: `${5 + (i % 4)}s`,
      },
    }
  })
  const height = Math.max(180, Math.ceil(rows.length / 3) * 64 + 60)

  return (
    <section className="daily-mood">
      <div className="subhead-row">
        <h3 className="subhead">Today's vibe on the floor</h3>
        <span className="card-meta">{rows.length} logged</span>
      </div>

      <div className="mood-sky" style={{ height }}>
        {bubbles.length ? bubbles.map(b => (
          <span key={b.id} className={`mood-bubble mood-${toneOf(b.mood)} ${b.name === me ? 'is-me' : ''}`} style={b.style}>
            <strong>{firstName(b.name)}</strong>
            <span>{b.mood}</span>
          </span>
        )) : <span className="mood-empty">Nobody has logged a mood yet today. Be the first.</span>}
      </div>

      <div className="card mood-picker">
        <div className="card-title">{mine ? <>Your mood today: <span className={`mood-tag mood-${toneOf(mine.mood)}`}>{mine.mood}</span></> : "How's today going?"}</div>
        <div className="card-meta">{mine ? 'Tap another to change it.' : 'One tap. Resets every day.'}</div>
        <div className="np-chips" style={{ marginTop: 10 }}>
          {DAILY_MOODS.map(m => (
            <button key={m.label} type="button" className={`np-chip ${mine?.mood === m.label ? 'on' : ''}`} aria-pressed={mine?.mood === m.label} onClick={() => pick(m.label)}>{m.label}</button>
          ))}
          <button type="button" className={`np-chip ${showCustom ? 'on' : ''}`} onClick={() => setShowCustom(s => !s)}>Something else</button>
        </div>
        {showCustom && (
          <form className="inline-ask" onSubmit={e => { e.preventDefault(); pick(custom) }}>
            <input aria-label="Your own mood" value={custom} onChange={e => setCustom(e.target.value)} maxLength={30} placeholder="e.g. deadline mode" autoFocus />
            <button className="btn small" type="submit">Log it</button>
          </form>
        )}
      </div>
    </section>
  )
}
