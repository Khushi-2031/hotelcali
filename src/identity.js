import { useEffect, useState } from 'react'
import { ALL_PEOPLE, FLOOR } from './data/roster'

// No logins on this app: each phone checks in once (name + room) and
// remembers it. That name is what targeted notifications are addressed to.
const KEY = 'hc_me'
const ROOM_KEY = 'hc_room'
const EVT = 'hc-me-change'

export function slug(name) {
  return String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function firstName(name) {
  return String(name || '').split(' ')[0]
}

export function roomOf(name) {
  return FLOOR.find(r => r.people.includes(name))?.room || ''
}

// "Keep me checked in" stores the check-in in localStorage (stays until you
// check out). Otherwise it lives in sessionStorage and ends when the app closes.
const PIN_OK = 'hc_pin_ok'

function read(k) {
  try { return localStorage.getItem(k) ?? sessionStorage.getItem(k) } catch { return null }
}

export function getMe() {
  const v = read(KEY)
  return ALL_PEOPLE.includes(v) ? v : null
}

export function getRoom() {
  return read(ROOM_KEY) || roomOf(getMe())
}

export function pinVerified() {
  return read(PIN_OK) === '1'
}

export function setMe(name, room, remember = true) {
  try {
    for (const st of [localStorage, sessionStorage]) {
      st.removeItem(KEY); st.removeItem(ROOM_KEY); st.removeItem(PIN_OK)
    }
    if (name) {
      const st = remember ? localStorage : sessionStorage
      st.setItem(KEY, name)
      st.setItem(ROOM_KEY, room || roomOf(name))
      st.setItem(PIN_OK, '1')
    }
  } catch { /* private mode: lasts for this visit only */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: name || null }))
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

export function useRoom() {
  const me = useMe()
  return me ? getRoom() : ''
}

export const SPC_REPS = ['Vismay Bhatt', 'Simran Gupta']
