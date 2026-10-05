import { useState } from 'react'
import { ymd } from '../data/academicCalendar'
import { useMessMenu, MEALS, currentMeal } from '../messMenu'

function dayLabel(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
}

export default function MessMenu() {
  const menu = useMessMenu()
  const today = ymd()
  const days = menu?.days || []
  const [day, setDay] = useState(null)
  const [meal, setMeal] = useState(currentMeal())

  const selected = day || (days.some(d => d.date === today) ? today : days[0]?.date)
  const entry = days.find(d => d.date === selected)
  const items = entry ? [...(entry[meal] || []), ...(meal === 'dinner' ? entry.dessert || [] : [])] : []
  const nonveg = new Set(entry?.nonveg || [])
  const dessert = new Set(entry?.dessert || [])
  const notes = (menu?.notes || []).filter(n => !n.date || n.date === selected)

  return (
    <>
      <h3 className="subhead">Mess menu</h3>
      <div className="card mess-card">
        {!menu ? <div className="card-meta">Loading the menu…</div>
          : !entry ? <div className="card-meta">This week's menu hasn't come in yet. It shows up here once the Mess Committee mails it.</div>
          : <>
            <div className="quick-chips mess-days">
              {days.map(d => (
                <button key={d.date} type="button" className={`np-chip ${d.date === selected ? 'on' : ''}`} aria-pressed={d.date === selected} onClick={() => setDay(d.date)}>
                  {d.date === today ? 'Today' : dayLabel(d.date)}
                </button>
              ))}
            </div>
            <div className="mess-meals" role="tablist">
              {MEALS.map(m => (
                <button key={m.key} type="button" role="tab" aria-selected={m.key === meal} className={`mess-meal ${m.key === meal ? 'on' : ''}`} onClick={() => setMeal(m.key)}>{m.label}</button>
              ))}
            </div>
            {notes.map((n, i) => <div key={i} className="mess-note">Change: {n.text}</div>)}
            <ul className="mess-items">
              {items.length ? items.map((it, i) => (
                <li key={i} className={nonveg.has(it) ? 'nonveg' : dessert.has(it) ? 'dessert' : ''}>{it}{dessert.has(it) && <small> dessert</small>}</li>
              )) : <li className="card-meta">Nothing listed.</li>}
            </ul>
            <div className="card-meta">Week of {dayLabel(menu.week_start)} to {dayLabel(menu.week_end)}{menu.updated_at && `, updated ${new Date(menu.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</div>
          </>}
      </div>
    </>
  )
}
