import { useEffect, useState } from 'react'
import { ALL_PEOPLE } from './data/roster'

// No logins on this app: each phone just remembers who is using it.
// That name is what targeted notifications are addressed to.
const KEY = 'hc_me'
const EVT = 'hc-me-change'

export function slug(name) {
  return String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function firstName(name) {
  return String(name || '').split(' ')[0]
}

export function getMe() {
  try {
    const v = localStorage.getItem(KEY)
    return ALL_PEOPLE.includes(v) ? v : null
  } catch { return null }
}

export function setMe(name) {
  try { localStorage.setItem(KEY, name) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: name }))
}

export function useMe() {
  const [me, set] = useState(getMe())
  useEffect(() => {
    const h = (e) => set(e.detail)
    window.addEventListener(EVT, h)
    return () => window.removeEventListener(EVT, h)
  }, [])
  return me
}

export const SPC_REPS = ['Vismay Bhatt', 'Simran Gupta']
