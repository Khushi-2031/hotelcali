// Automatic usage log: app opens, tab visits and button taps.
// Only button/link labels are recorded, never anything typed into a field.
import { supabase } from './supabaseClient'
import { getMe, getRoom } from './identity'

const SESSION = Math.random().toString(36).slice(2, 10)
let queue = []
let currentTab = null
let timer = null
let started = false

function device() {
  const phone = /iphone|ipad|android|mobile/i.test(navigator.userAgent)
  const app = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone
  return `${phone ? 'phone' : 'desktop'}${app ? ' app' : ''}`
}

function push(kind, target) {
  const name = getMe()
  if (!name) return
  queue.push({ name, room: getRoom() || null, kind, tab: currentTab, target: target ? String(target).slice(0, 80) : null, device: device(), session: SESSION })
  clearTimeout(timer)
  timer = setTimeout(flush, 4000)
}

export async function flush() {
  if (!queue.length) return
  const rows = queue
  queue = []
  try {
    const { error } = await supabase.from('activity_log').insert(rows)
    if (error && !/activity_log/.test(error.message)) console.warn('activity log', error.message)
  } catch { /* offline: drop quietly */ }
}

export function trackTab(id) {
  if (id === currentTab) return
  currentTab = id
  push('tab', id)
}

function labelOf(el) {
  if (el.matches('input')) {
    const lab = el.closest('label')?.innerText || el.getAttribute('aria-label') || el.name || 'option'
    return `${el.checked ? 'Ticked' : 'Unticked'} ${lab}`.replace(/\s+/g, ' ').trim()
  }
  const own = el.getAttribute('aria-label') || el.getAttribute('title') || el.querySelector?.('.nav-label, .dir-label')?.innerText
  const text = (own || el.innerText || el.value || '').replace(/\s+/g, ' ').trim()
  return text || el.className || el.tagName.toLowerCase()
}

export function startTracking(tab) {
  if (started) return
  started = true
  currentTab = tab
  push('open', tab)
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('button, a, [role="button"], summary, input[type="checkbox"], input[type="radio"]')
    if (!el || el.closest('[data-no-track]')) return
    push('tap', labelOf(el))
  }, true)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)
}

export const activityFeed = (pin, since) =>
  supabase.rpc('activity_feed', { p_pin: pin, p_since: since })
