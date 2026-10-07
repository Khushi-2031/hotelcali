/* global __BUILD__ */
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'

// Reload when a newer build is live, so phones never get stuck on an old copy.
export function watchForUpdates() {
  if (BUILD === 'dev') return
  async function check() {
    try {
      const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.build && j.build !== BUILD) location.reload()
    } catch { /* offline */ }
  }
  check()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
}
