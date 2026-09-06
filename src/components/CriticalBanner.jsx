import { useEffect, useState } from 'react'
import { listAll } from '../api'

export default function CriticalBanner({ refreshKey }) {
  const [wakeups, setWakeups] = useState([])
  const [alerts, setAlerts] = useState([])

  async function refresh() {
    const now = Date.now()
    const [w, a] = await Promise.all([listAll('wakeup_calls'), listAll('admin_alerts')])
    setWakeups(w.filter(x => x.critical && new Date(x.wake_at).getTime() >= now - 30 * 60 * 1000))
    setAlerts(a.filter(x => now - new Date(x.created_at).getTime() <= 30 * 60 * 1000))
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [refreshKey])

  if (!wakeups.length && !alerts.length) return null

  return (
    <div className="critical-banner show">
      {alerts.slice(0, 3).map((a, i) => (
        <span key={a.id}>
          {i > 0 && ' | '}
          <span className="tag">ADMIN ALERT</span> {a.message} — {a.name}
        </span>
      ))}
      {alerts.length > 0 && wakeups.length > 0 && ' | '}
      {wakeups.slice(0, 3).map((w, i) => (
        <span key={w.id}>
          {i > 0 && ' | '}
          <span className="tag">GRADE-CUT ALARM</span> {w.name} needs waking at{' '}
          {new Date(w.wake_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          {w.room ? ` · Room ${w.room}` : ''}
        </span>
      ))}
    </div>
  )
}
