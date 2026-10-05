import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useMe } from '../identity'

const BELL_KEY = 'hc_bell'
export const bellOn = () => { try { return localStorage.getItem(BELL_KEY) !== 'off' } catch { return true } }
export const setBell = (on) => { try { localStorage.setItem(BELL_KEY, on ? 'on' : 'off') } catch { /* ignore */ } }

let ctx = null
function audio() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Browsers only allow sound after the person has tapped something once.
if (typeof window !== 'undefined') {
  const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock) }
  window.addEventListener('pointerdown', unlock)
}

/** A hotel front-desk bell: bright strike with a long shimmering decay. */
export function ringBell() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const out = ac.createGain()
  out.gain.value = 0.5
  out.connect(ac.destination)
  // Bell partials (slightly inharmonic, like real metal)
  ;[[1568, 0.55, 1.8], [2349, 0.3, 1.2], [3951, 0.18, 0.7], [5274, 0.08, 0.4]].forEach(([f, g, d]) => {
    const o = ac.createOscillator()
    const v = ac.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(f, t)
    v.gain.setValueAtTime(0.0001, t)
    v.gain.exponentialRampToValueAtTime(g, t + 0.005)
    v.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(v); v.connect(out)
    o.start(t); o.stop(t + d + 0.05)
  })
}

/**
 * Listens for new pings and admin alerts while the app is open.
 * Shows a banner at the top and rings the lobby bell.
 */
export default function LobbyBell() {
  const me = useMe()
  const [banners, setBanners] = useState([])
  const meRef = useRef(me)
  meRef.current = me

  function show(b) {
    setBanners(list => [...list, b].slice(-3))
    if (bellOn()) ringBell()
    if (navigator.vibrate) navigator.vibrate([60, 40, 60])
    setTimeout(() => setBanners(list => list.filter(x => x.id !== b.id)), 8000)
  }

  useEffect(() => {
    const channel = supabase
      .channel('lobby-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pings' }, ({ new: p }) => {
        const who = meRef.current
        const list = p.recipients || []
        if (!who || p.from_name === who) return
        if (!list.includes('ALL') && !list.includes(who)) return
        show({ id: p.id, title: p.title || 'Hotel Cali', body: p.body || '' })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_alerts' }, ({ new: a }) => {
        if (a.name === meRef.current) return
        show({ id: a.id, title: 'Admin alert', body: `${a.message} (${a.name})`, alert: true })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!banners.length) return null
  return (
    <div className="lobby-banners" role="status" aria-live="polite">
      {banners.map(b => (
        <button key={b.id} className={`lobby-banner ${b.alert ? 'is-alert' : ''}`} onClick={() => setBanners(l => l.filter(x => x.id !== b.id))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 10V7M10 7h4M3 17h18M4 20h16" /></svg>
          <span className="lb-text"><strong>{b.title}</strong><span>{b.body}</span></span>
        </button>
      ))}
    </div>
  )
}
