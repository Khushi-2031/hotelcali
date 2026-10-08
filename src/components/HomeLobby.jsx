import { useEffect, useMemo, useState } from 'react'
import { listAll } from '../api'
import { useMe, firstName, isGuest } from '../identity'
import { useSchedule, useMySubjects, classesOn } from '../schedule'
import { useMessMenu, MEALS } from '../messMenu'
import { ymd } from '../data/academicCalendar'
import { netBalances, fmtINR, toRupees } from '../split'
import { visibleGroups, GroupTiles } from './Sidebar'

const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const dayWord = (n, d) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }))

function useNextClass() {
  const schedule = useSchedule()
  const subjects = useMySubjects()
  return useMemo(() => {
    if (!schedule || !subjects.length) return { needsPick: !!schedule && !subjects.length }
    const now = new Date()
    for (let i = 0; i < 8; i++) {
      const d = addDays(now, i)
      const list = classesOn(schedule, ymd(d), subjects).filter(c => i > 0 || c.end > hm(now))
      if (list.length) return { c: list[0], when: dayWord(i, d), left: list.length }
    }
    return {}
  }, [schedule, subjects])
}

function useNextMeal() {
  const menu = useMessMenu()
  if (!menu) return null
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  let day = now, meal = MEALS.find(m => mins <= m.until)
  if (!meal) { day = addDays(now, 1); meal = MEALS[0] }
  const entry = menu.days?.find(d => d.date === ymd(day))
  return { meal, items: entry?.[meal.key] || [], tomorrow: day !== now }
}

function useLiveFloor(me) {
  const [run, setRun] = useState(null)
  const [net, setNet] = useState(null)
  useEffect(() => {
    let alive = true
    listAll('blinkit_orders', { ascending: false }).then(rows => {
      const cutoff = Date.now() - 6 * 3600 * 1000
      if (alive) setRun(rows.find(r => r.run === 'Blinkit run' && !r.done && new Date(r.created_at).getTime() > cutoff) || null)
    })
    if (me && !isGuest(me)) {
      Promise.all([listAll('expenses'), listAll('settlements')]).then(([e, s]) => {
        const nowIso = new Date().toISOString()
        if (alive) setNet(toRupees(netBalances(e.filter(x => x.created_at <= nowIso), s)[me] || 0))
      })
    }
    return () => { alive = false }
  }, [me])
  return { run, net }
}

function NowCard({ tone, kicker, title, sub, onClick }) {
  return (
    <button type="button" className={`now-card tone-${tone}`} onClick={onClick}>
      <span className="now-kicker">{kicker}</span>
      <span className="now-title">{title}</span>
      {sub && <span className="now-sub">{sub}</span>}
    </button>
  )
}

export default function HomeLobby({ go }) {
  const me = useMe()
  const next = useNextClass()
  const meal = useNextMeal()
  const { run, net } = useLiveFloor(me)
  const groups = visibleGroups(me)

  const live = {}
  if (next.c) live.calendar = `Next: ${next.c.start} ${next.when.toLowerCase()}`
  if (meal?.items.length) live.meals = `${meal.meal.label}: ${meal.items[0]}`
  if (run) live.blinkit = `${firstName(run.name)} is ordering`
  if (net) live.split = net > 0 ? `You get back ${fmtINR(net)}` : `You owe ${fmtINR(-net)}`

  return (
    <div className="lobby">
      <div className="now-strip" aria-label="Right now">
        {next.c ? (
          <NowCard tone="aqua" kicker={`Next class · ${next.when} ${next.c.start}`} title={next.c.title || next.c.course}
            sub={[next.c.room, next.c.faculty].filter(Boolean).join(' · ')} onClick={() => go('calendar')} />
        ) : (
          <NowCard tone="aqua" kicker="Classes" title={next.needsPick ? 'Pick your 2 specializations' : 'No classes coming up'}
            sub={next.needsPick ? 'To see your timetable here' : null} onClick={() => go('calendar')} />
        )}
        {meal && (
          <NowCard tone="sun" kicker={`${meal.tomorrow ? 'Tomorrow · ' : 'Next meal · '}${meal.meal.label}`}
            title={meal.items.length ? meal.items.slice(0, 2).join(', ') : 'Menu not in yet'}
            sub={meal.items.length > 2 ? `+${meal.items.length - 2} more` : null} onClick={() => go('meals')} />
        )}
        <NowCard tone="pink" kicker="Blinkit"
          title={run ? `${firstName(run.name)} is ordering` : 'No run open'}
          sub={run ? run.item : 'Start one and ping the floor'} onClick={() => go('blinkit')} />
        {net !== null && (
          <NowCard tone="mint" kicker="Settle Up"
            title={net === 0 ? 'All square' : net > 0 ? `You get back ${fmtINR(net)}` : `You owe ${fmtINR(-net)}`}
            sub="Open your balances" onClick={() => go('split')} />
        )}
      </div>

      {groups.map(g => (
        <section className="shelf" key={g.id} aria-label={g.label}>
          <h3 className="subhead shelf-head">{g.label}</h3>
          <GroupTiles group={g} onSelect={go} live={live} />
        </section>
      ))}
    </div>
  )
}
