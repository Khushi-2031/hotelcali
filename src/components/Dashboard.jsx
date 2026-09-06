import { useEffect, useState } from 'react'
import { listAll } from '../api'
import { SectionHead } from './ui'
import MealClock from './MealClock'

export default function Dashboard() {
  const [stats, setStats] = useState({ blinkit: 0, maint: 0, plans: 0, washer: 'Free' })

  useEffect(() => {
    (async () => {
      const [blinkit, maint, plans, washer] = await Promise.all([
        listAll('blinkit_orders'), listAll('maintenance_requests'),
        listAll('plans'), listAll('washer_log'),
      ])
      const openBlinkit = blinkit.filter(o => !o.done).length
      const openMaint = maint.filter(m => !m.resolved).length
      const today = new Date().toDateString()
      const todayPlans = plans.filter(p => new Date(p.created_at).toDateString() === today).length
      const busy = washer.length && !washer[washer.length - 1].done
      setStats({ blinkit: openBlinkit, maint: openMaint, plans: todayPlans, washer: busy ? 'In use' : 'Free' })
    })()
  }, [])

  return (
    <div>
      <SectionHead title="Floor 4, at a glance" desc="Everything happening on the floor right now — pull any thread from the menu for the full picture." />
      <div className="grid">
        <div className="stat"><div className="n">{stats.blinkit}</div><div className="l">Blinkit orders open</div></div>
        <div className="stat"><div className="n">{stats.maint}</div><div className="l">Maintenance tickets open</div></div>
        <div className="stat"><div className="n">{stats.plans}</div><div className="l">Plans posted today</div></div>
        <div className="stat"><div className="n">{stats.washer}</div><div className="l">Washing machine</div></div>
      </div>
      <h3 className="subhead">Meal & water clock</h3>
      <div className="card"><MealClock compact /></div>
    </div>
  )
}
