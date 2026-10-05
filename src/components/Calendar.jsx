import { useState } from 'react'
import { ACADEMIC_CALENDAR, TYPE_LABEL, ymd, fmtRange } from '../data/academicCalendar'
import { useSchedule, useMySubjects, setMySubjects, classesOn } from '../schedule'
import { SectionHead, Empty } from './ui'

function addDays(day, n) {
  const d = new Date(day + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return ymd(d)
}

function MyClasses() {
  const schedule = useSchedule()
  const subjects = useMySubjects()
  const [day, setDay] = useState(ymd())
  const [editing, setEditing] = useState(false)
  const all = schedule?.subjects || []
  const classes = classesOn(schedule, day, subjects)
  const label = new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  if (!schedule) return null
  if (!(schedule.sessions || []).length) {
    return (
      <>
        <h3 className="subhead">My classes</h3>
        <Empty>The class timetable isn't connected yet. Once it is, your daily classes show here and on the Front Desk, updated every hour.</Empty>
      </>
    )
  }

  function toggle(s) {
    setMySubjects(subjects.includes(s) ? subjects.filter(x => x !== s) : [...subjects, s])
  }

  return (
    <>
      <div className="subhead-row">
        <h3 className="subhead">My classes</h3>
        <button className="link-btn" onClick={() => setEditing(e => !e)}>{editing ? 'Done' : `My subjects (${subjects.length || 'all'})`}</button>
      </div>
      {editing && (
        <div className="card">
          <div className="card-meta">Pick the subjects you take. Leave all off to see every class.</div>
          <div className="np-chips" style={{ marginTop: 10 }}>
            {all.map(s => <button key={s} type="button" className={`np-chip ${subjects.includes(s) ? 'on' : ''}`} aria-pressed={subjects.includes(s)} onClick={() => toggle(s)}>{s}</button>)}
          </div>
        </div>
      )}
      <div className="day-nav">
        <button className="btn small ghost" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">‹</button>
        <span className="day-label">{day === ymd() ? `Today, ${label}` : label}</span>
        <button className="btn small ghost" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">›</button>
      </div>
      <div className="card">
        {classes.length ? classes.map((c, i) => (
          <div className="class-row" key={i}>
            <span className="class-time">{c.start}<br /><small>{c.end}</small></span>
            <span className="class-info"><strong>{c.subject}</strong>{(c.room || c.faculty) && <small>{[c.room, c.faculty].filter(Boolean).join(' · ')}</small>}</span>
          </div>
        )) : <div className="card-meta">No classes.</div>}
        {schedule.updated_at && <div className="card-meta" style={{ marginTop: 10 }}>Timetable checked {new Date(schedule.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>}
      </div>
    </>
  )
}

export default function Calendar() {
  const [showPast, setShowPast] = useState(false)
  const today = ymd()
  const list = ACADEMIC_CALENDAR.filter(e => showPast || (e.end || e.start) >= today)
  const byMonth = list.reduce((acc, e) => {
    const m = new Date(e.start + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    ;(acc[m] = acc[m] || []).push(e)
    return acc
  }, {})

  return (
    <div>
      <SectionHead title="Calendar" desc="Your classes for the day, plus MICA's academic and event calendar for PGP-31 (as on 26 Aug 2026)." />
      <MyClasses />
      <div className="subhead-row">
        <h3 className="subhead">Academic calendar</h3>
        <button className="link-btn" onClick={() => setShowPast(s => !s)}>{showPast ? 'Hide past' : 'Show past'}</button>
      </div>
      {Object.entries(byMonth).map(([month, items]) => (
        <div key={month} className="cal-month">
          <div className="cal-month-name">{month}</div>
          <div className="card">
            {items.map((e, i) => {
              const now = e.start <= today && (e.end || e.start) >= today
              return (
                <div key={i} className={`cal-row ${now ? 'is-now' : ''} ${(e.end || e.start) < today ? 'is-past' : ''}`}>
                  <span className="cal-date">{fmtRange(e)}</span>
                  <span className="cal-title">{e.title}</span>
                  <span className={`cal-pill cal-${e.type}`}>{now ? 'Now' : TYPE_LABEL[e.type]}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
