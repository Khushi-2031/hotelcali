import { useEffect, useState } from 'react'
import { listAll, getMeta, setMeta, updateRow, supabase } from '../api'
import { ALL_PEOPLE, DUTY_TYPES } from '../data/roster'
import { SectionHead, Pill, Empty } from './ui'
import { pushToast } from './Toast'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
function weekIndexFor(anchor) { return Math.floor((Date.now() - anchor) / WEEK_MS) }

export default function Duties() {
  const [anchor, setAnchor] = useState(null)
  const [weekLog, setWeekLog] = useState({})
  const [points, setPoints] = useState([])

  async function load() {
    let a = await getMeta('duty_anchor', null)
    if (a === null) { a = Date.now(); await setMeta('duty_anchor', a) }
    setAnchor(a)
    const wIdx = weekIndexFor(a)
    const weekKey = 'w' + wIdx
    const log = await listAll('duty_log')
    const thisWeek = {}
    log.filter(l => l.week_key === weekKey).forEach(l => { thisWeek[l.duty] = l.person })
    setWeekLog(thisWeek)
    const pts = await listAll('duty_points')
    setPoints(pts.sort((a, b) => b.points - a.points))
  }

  useEffect(() => { load() }, [])

  if (anchor === null) return null
  const wIdx = weekIndexFor(anchor)
  const weekKey = 'w' + wIdx
  const assignments = DUTY_TYPES.map((duty, di) => ({
    duty, person: ALL_PEOPLE[(wIdx + di) % ALL_PEOPLE.length], done: !!weekLog[duty],
  }))
  const maxPts = points.length ? points[0].points : 1

  async function markDone(duty, person) {
    const { error } = await supabase.from('duty_log').insert({ week_key: weekKey, duty, person })
    if (error) { pushToast('Already logged for this week'); return }
    const existing = points.find(p => p.name === person)
    await supabase.from('duty_points').upsert({ name: person, points: (existing?.points || 0) + 10 })
    pushToast(`${person} +10 points for ${duty.split(' (')[0]}`)
    load()
  }

  return (
    <div>
      <SectionHead title="Weekly duties" desc="Duties rotate automatically every week across everyone on the floor. Mark yours done to earn points — see the reward system below." />
      <div className="roster-week">
        <Pill tone="blue">Week {wIdx + 1}</Pill>
        <span className="card-meta">Rotation started {new Date(anchor).toLocaleDateString()}</span>
      </div>
      {assignments.map(a => (
        <div className="card" key={a.duty}>
          <div className="card-top">
            <span className="card-title">{a.duty}</span>
            {a.done ? <Pill tone="teal">Done this week</Pill> : <Pill tone="blue">Pending</Pill>}
          </div>
          <div className="card-body">Assigned to <strong>{a.person}</strong></div>
          {!a.done && <button className="btn small" style={{ marginTop: 8 }} onClick={() => markDone(a.duty, a.person)}>Mark done (+10)</button>}
        </div>
      ))}
      <h3 className="subhead">Points leaderboard</h3>
      {points.length ? points.map(p => (
        <div className="bar-wrap" key={p.name}>
          <div className="bar-name">{p.name}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.points / maxPts) * 100}%` }} /></div>
          <div className="bar-val">{p.points} pts</div>
        </div>
      )) : <Empty>No points logged yet — be the first to close out a duty.</Empty>}
      <h3 className="subhead">How the rewards work</h3>
      <div className="card">
        <div className="card-body">
          Each completed duty is worth <strong>+10 points</strong>, logged the moment you tick it off.<br /><br />
          <strong>Weekly MVP</strong> (top of the leaderboard) gets first pick on Friday night plans and skips the following week's rotation.<br />
          <strong>Lowest scorer</strong> that week owes the floor one Blinkit run solo, no split.<br />
          Ties are settled by whoever logged their duty earliest in the week.
        </div>
      </div>
    </div>
  )
}
