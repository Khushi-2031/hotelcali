import { useSchedule, useMySubjects, setMySubjects, groupName, MAX_SPECS } from '../schedule'

export function ClassRow({ c }) {
  const meta = [c.course + (c.n ? ` · session ${c.n}` : ''), c.room, c.faculty].filter(Boolean).join(' · ')
  return (
    <div className="class-row">
      <span className="class-time">{c.start}<br /><small>{c.end}</small></span>
      <span className="class-info">
        <strong>{c.title || c.course}</strong>
        <small>{meta}</small>
        {c.note && <span className="class-note">{c.note}</span>}
      </span>
    </div>
  )
}

export function EventRow({ e }) {
  return (
    <div className="class-row class-event">
      <span className="class-time">{e.start || 'All'}<br /><small>{e.end || 'day'}</small></span>
      <span className="class-info"><strong>{e.title}</strong></span>
    </div>
  )
}

// Pick up to two specializations. Controlled when value/onChange are passed (check-in),
// otherwise reads and saves this device's choice directly.
export function SpecPicker({ value, onChange }) {
  const schedule = useSchedule()
  const mine = useMySubjects()
  const picked = value ?? mine
  const set = onChange ?? setMySubjects
  const all = schedule?.subjects || []
  if (!all.length) return null
  function toggle(s) {
    if (picked.includes(s)) return set(picked.filter(x => x !== s))
    set(picked.length >= MAX_SPECS ? [picked[picked.length - 1], s] : [...picked, s])
  }
  return (
    <div className="np-chips spec-chips">
      {all.map(s => (
        <button key={s} type="button" className={`np-chip ${picked.includes(s) ? 'on' : ''}`} aria-pressed={picked.includes(s)} onClick={() => toggle(s)}>
          <b>{s}</b> {groupName(schedule, s)}
        </button>
      ))}
    </div>
  )
}
