import { useEffect, useState } from 'react'
import { getMeta } from './api'

// Class schedule from MICA's SharePoint timetable. Shape:
// { updated_at, checked_at, groups: { S1: 'FMCG & FMCD', ... },
//   sessions: [{ date, start, end, subject: 'S7', course, title, faculty, n, room, note }],
//   events: [{ date, title, start, end }] }
// Each person picks their 2 specializations (S1 to S8); we show only those classes.
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
let pending = null

function normalise(raw) {
  const j = raw || {}
  const groups = j.groups || {}
  return {
    ...j,
    groups,
    subjects: Object.keys(groups).length ? Object.keys(groups).sort() : (j.subjects || []),
    sessions: j.sessions || [],
    events: j.events || [],
  }
}

// Saved by scripts/schedule-sync.js (run from a browser signed in to MICA SharePoint)
// into app_meta "class_schedule". Falls back to the old /schedule.json.
async function loadSchedule() {
  const live = await getMeta('class_schedule', null)
  if (live) return normalise(live)
  try {
    const r = await fetch(`/schedule.json?t=${Math.floor(Date.now() / 600000)}`)
    return normalise(r.ok ? await r.json() : null)
  } catch { return normalise(null) }
}

export function useSchedule() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    if (cache) return
    pending ||= loadSchedule().then(d => (cache = d))
    pending.then(setData)
  }, [])
  return data
}

export const MAX_SPECS = 2
export const groupName = (schedule, s) => schedule?.groups?.[s] || s

export function classesOn(schedule, day, subjects) {
  if (!schedule) return []
  return (schedule.sessions || [])
    .filter(s => s.date === day && (!subjects.length || subjects.includes(s.subject)))
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Holidays, exams, student activities: for everyone.
export function eventsOn(schedule, day) {
  return (schedule?.events || []).filter(e => e.date === day)
}
