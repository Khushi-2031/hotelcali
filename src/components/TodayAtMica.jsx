import { onDay, upcoming, ymd, fmtRange, TYPE_LABEL } from '../data/academicCalendar'
import { useSchedule, useMySubjects, classesOn } from '../schedule'

export default function TodayAtMica() {
  const today = ymd()
  const schedule = useSchedule()
  const subjects = useMySubjects()
  const classes = classesOn(schedule, today, subjects)
  const events = onDay(today)
  const next = upcoming(today, 4).filter(e => !events.includes(e)).slice(0, 2)
  const hasSchedule = (schedule?.sessions || []).length > 0

  return (
    <>
      <h3 className="subhead">Today at MICA</h3>
      <div className="card today-card">
        {hasSchedule ? (
          classes.length ? classes.map((c, i) => (
            <div className="class-row" key={i}>
              <span className="class-time">{c.start}<br /><small>{c.end}</small></span>
              <span className="class-info"><strong>{c.subject}</strong>{(c.room || c.faculty) && <small>{[c.room, c.faculty].filter(Boolean).join(' · ')}</small>}</span>
            </div>
          )) : <div className="card-meta">{subjects.length ? 'No classes for your subjects today.' : 'Pick your subjects in the Calendar tab to see your classes here.'}</div>
        ) : <div className="card-meta">Your daily class schedule will show here once the class timetable sync is switched on.</div>}
        {events.map((e, i) => (
          <div className="today-event" key={'e' + i}><span className={`cal-pill cal-${e.type}`}>{TYPE_LABEL[e.type]}</span>{e.title}</div>
        ))}
        {next.length > 0 && (
          <div className="today-next">
            <span className="card-meta">Coming up</span>
            {next.map((e, i) => <div key={'n' + i} className="today-next-row"><span>{e.title}</span><span className="card-meta">{fmtRange(e)}</span></div>)}
          </div>
        )}
      </div>
    </>
  )
}
