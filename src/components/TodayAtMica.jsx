import { onDay, upcoming, ymd, fmtRange, TYPE_LABEL } from '../data/academicCalendar'
import { useSchedule, useMySubjects, classesOn, eventsOn, MAX_SPECS } from '../schedule'
import { ClassRow, EventRow, SpecPicker } from './Classes'

export default function TodayAtMica() {
  const today = ymd()
  const schedule = useSchedule()
  const subjects = useMySubjects()
  const classes = classesOn(schedule, today, subjects)
  const events = onDay(today)
  const next = upcoming(today, 4).filter(e => !events.includes(e)).slice(0, 2)
  const hasSchedule = (schedule?.sessions || []).length > 0
  const sheetEvents = eventsOn(schedule, today)

  return (
    <>
      <h3 className="subhead">Today at MICA</h3>
      <div className="card today-card">
        {hasSchedule ? (
          <>
            {subjects.length < MAX_SPECS && (
              <div className="spec-prompt">
                <div className="card-meta" style={{ marginBottom: 8 }}>{subjects.length ? 'Pick your second specialization.' : 'Pick your 2 specializations to see your classes here.'}</div>
                <SpecPicker />
              </div>
            )}
            {subjects.length > 0 && (
              <>
                {sheetEvents.map((e, i) => <EventRow key={'se' + i} e={e} />)}
                {classes.map((c, i) => <ClassRow key={i} c={c} />)}
                {!classes.length && !sheetEvents.length && <div className="card-meta">No classes for you today.</div>}
              </>
            )}
          </>
        ) : <div className="card-meta">Your daily classes will show here once the timetable is loaded.</div>}
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
