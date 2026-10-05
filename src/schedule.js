import { useEffect, useState } from 'react'

// Class schedule lives in /schedule.json, refreshed from the SharePoint sheet
// by an hourly job. Shape:
// { updated_at, subjects: [string], sessions: [{ date, start, end, subject, faculty?, room? }] }
const KEY = 'hc_subjects'
const EVT = 'hc-subjects-change'

export function getMySubjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function setMySubjects(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: list }))
}

export function useMySubjects() {
  const [s, set] = useState(getMySubjects())
  useEffect(() => {
    const h = (e) => set(e.detail)
    window.addEventListener(EVT, h)
    return () => window.removeEventListener(EVT, h)
  }, [])
  return s
}

let cache = null
export function useSchedule() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    if (cache) return
    fetch(`/schedule.json?t=${Math.floor(Date.now() / 600000)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { cache = j || { subjects: [], sessions: [] }; setData(cache) })
      .catch(() => { cache = { subjects: [], sessions: [] }; setData(cache) })
  }, [])
  return data
}

export function classesOn(schedule, day, subjects) {
  if (!schedule) return []
  return (schedule.sessions || [])
    .filter(s => s.date === day && (!subjects.length || subjects.includes(s.subject)))
    .sort((a, b) => a.start.localeCompare(b.start))
}
