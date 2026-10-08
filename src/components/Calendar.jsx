import { useState } from 'react'
import { ACADEMIC_CALENDAR, TYPE_LABEL, ymd, fmtRange } from '../data/academicCalendar'
import { useSchedule, useMySubjects, classesOn, eventsOn, MAX_SPECS } from '../schedule'
import { ClassRow, EventRow, SpecPicker } from './Classes'
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
  const classes = classesOn(schedule, day, subjects)
  const events = eventsOn(schedule, day)
  const label = new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  if (!schedule) return null
  if (!schedule.sessions.length) {
    return (
      <>
        <h3 className="subhead">My classes</h3>
        <Empty>The class timetable isn't loaded yet. Once it is, your daily classes show here and on the Front Desk.</Empty>
      </>
    )
  }
  const showPicker = editing || subjects.length < MAX_SPECS

  return (
    <>
      <div className="subhead-row">
        <h3 className="subhead">My classes</h3>
        {subjects.length > 0 && <button className="link-btn" onClick={() => setEditing(e => !e)}>{editing ? 'Done' : `My specializations: ${subjects.join(' + ')}`}</button>}
      </div>
      {showPicker && (
        <div className="card">
          <div className="card-meta">Pick your 2 specializations. You'll only see their classes.</div>
          <div style={{ marginTop: 10 }}><SpecPicker /></div>
        </div>
      )}
      <div className="day-nav">
        <button className="btn small ghost" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">‹</button>
        <span className="day-label">{day === ymd() ? `Today, ${label}` : label}</span>
        <button className="btn small ghost" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">›</button>
      </div>
      <div className="card">
        {events.map((e, i) => <EventRow key={'e' + i} e={e} />)}
        {classes.map((c, i) => <ClassRow key={i} c={c} />)}
        {!classes.length && !events.length && <div className="card-meta">{subjects.length ? 'No classes for you this day.' : 'No classes.'}</div>}
        {!subjects.length && classes.length > 0 && <div className="card-meta" style={{ marginTop: 8 }}>Showing every class. Pick your specializations above to see just yours.</div>}
        {schedule.checked_at && <div className="card-meta" style={{ marginTop: 10 }}>Timetable checked {new Date(schedule.checked_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>}
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
