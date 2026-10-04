import { useEffect, useState } from 'react'
import { MEAL_WINDOWS } from '../data/roster'

function minsNow() { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }
function toMins([h, m]) { return h * 60 + m }
function fmtHM([h, m]) { const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) }

export default function MealClock({ compact }) {
  const [now, setNow] = useState(minsNow())
  useEffect(() => {
    const t = setInterval(() => setNow(minsNow()), 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      {MEAL_WINDOWS.map(w => {
        const s = toMins(w.start), e = toMins(w.end)
        const active = now >= s && now <= e
        return (
          <div key={w.name} className={`schedule-row ${active ? 'now' : ''}`}>
            <span>{w.name}{active ? ' · open now' : ''}</span>
            <span>{fmtHM(w.start)} – {fmtHM(w.end)}</span>
          </div>
        )
      })}
    </div>
  )
}
