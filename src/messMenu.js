import { useEffect, useState } from 'react'

// Weekly mess menu lives in /mess-menu.json, refreshed from the Mess Committee's
// Outlook mail (messcomm@micamail.in) by a scheduled job. Shape:
// { updated_at, source, week_start, week_end,
//   days: [{ date, breakfast, lunch, snacks, dinner, dessert, nonveg? }],
//   notes: [{ date?, meal?, text }]   // mid-week swaps from "Re:" mails
// }
let cache = null
export function useMessMenu() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    if (cache) return
    fetch(`/mess-menu.json?t=${Math.floor(Date.now() / 600000)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { cache = j || { days: [], notes: [] }; setData(cache) })
      .catch(() => { cache = { days: [], notes: [] }; setData(cache) })
  }, [])
  return data
}

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast', until: 9 * 60 + 30 },
  { key: 'lunch', label: 'Lunch', until: 14 * 60 + 30 },
  { key: 'snacks', label: 'Snacks', until: 18 * 60 },
  { key: 'dinner', label: 'Dinner', until: 22 * 60 },
]

// The meal that's on now or coming up next (after dinner, show dinner).
export function currentMeal(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes()
  return (MEALS.find(x => m <= x.until) || MEALS[MEALS.length - 1]).key
}
