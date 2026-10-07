import { getMe, slug } from './identity'
import { supabase } from './supabaseClient'
import { BUILD } from './version'

// Record push problems in the activity log so they can be diagnosed remotely.
function logPushError(step, e) {
  try {
    supabase.from('activity_log').insert({
      name: getMe() || 'not checked in', kind: 'error', tab: 'notifications',
      target: `${step}: ${String(e?.message || e || 'unknown')}`.slice(0, 300),
      device: `${BUILD} | ${navigator.userAgent}`.slice(0, 300), session: 'push',
    }).then(() => {}, () => {})
  } catch { /* ignore */ }
}

// OneSignal only works on the site address it is configured for.
const LIVE_HOST = import.meta.env.VITE_SITE_HOST || 'thehotelcali.vercel.app'

let readyPromise = null

function withOneSignal(fn) {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(fn)
}

function isLocal() {
  return ['localhost', '127.0.0.1'].includes(location.hostname)
}

export function initOneSignal() {
  if (readyPromise) return readyPromise
  readyPromise = new Promise((resolve, reject) => {
    if (location.hostname !== LIVE_HOST && !isLocal()) {
      reject(new Error('wrong-host'))
      return
    }
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })
        // Self-heal: the phone allowed notifications but never finished
        // registering with OneSignal (or got opted out). Register it now.
        try {
          if (Notification.permission === 'granted' && !OneSignal.User.PushSubscription.optedIn) {
            await OneSignal.User.PushSubscription.optIn()
          }
        } catch { /* ignore */ }
        const me = getMe()
        if (me) await OneSignal.login(slug(me))
        resolve(OneSignal)
      } catch (e) {
        console.error('OneSignal init', e)
        logPushError('init', e)
        reject(e)
      }
    })
  })
  readyPromise.catch(() => {})
  return readyPromise
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

// Ties this device's push subscription to a person, so pings can be sent
// to specific people instead of the whole floor.
export function linkDeviceTo(name) {
  if (!name) return
  initOneSignal().then(OneSignal => OneSignal.login(slug(name))).catch(() => {})
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function notificationState() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  return Notification.permission // 'granted' | 'denied' | 'default'
}

/**
 * Turn on notifications for this phone. Always resolves with
 * { ok, message } so the UI can say exactly what happened.
 */
export async function enableNotifications() {
  if (location.hostname !== LIVE_HOST && !isLocal()) {
    return { ok: false, message: `Notifications only work on ${LIVE_HOST}. Preview links can't receive them.` }
  }
  if (notificationState() === 'unsupported') {
    if (isIOS() && !isInstalled()) {
      return { ok: false, message: 'On iPhone: tap Share, then "Add to Home Screen", and open Hotel Cali from your home screen. Then tap this again.' }
    }
    return { ok: false, message: "This browser can't show notifications. Try Chrome on Android or the Home Screen app on iPhone." }
  }
  if (Notification.permission === 'denied') {
    return { ok: false, message: 'Notifications are blocked for this site. Open your browser or phone settings for Hotel Cali, allow notifications, then tap this again.' }
  }
  let step = 'loading OneSignal'
  try {
    const OneSignal = await withTimeout(initOneSignal(), 10000)
    step = 'asking permission'
    await OneSignal.Notifications.requestPermission()
    if (Notification.permission !== 'granted') {
      return { ok: false, message: "You didn't allow notifications. Tap again and choose Allow." }
    }
    step = 'registering'
    try { await OneSignal.User.PushSubscription.optIn() } catch (e) { logPushError('optIn', e) }
    step = 'linking your name'
    const me = getMe()
    if (me) await OneSignal.login(slug(me))
    step = 'waiting for OneSignal'
    // Wait for OneSignal to hand back a subscription id: that is the real proof.
    const sub = OneSignal.User.PushSubscription
    for (let i = 0; i < 20 && !(sub.id && sub.optedIn); i++) await new Promise(r => setTimeout(r, 500))
    if (!(sub.id && sub.optedIn)) {
      logPushError('no subscription id', `id=${sub.id} optedIn=${sub.optedIn} perm=${Notification.permission}`)
      return { ok: false, message: "Your phone allowed notifications but didn't finish registering. Close the app fully, reopen it, and tap this again." }
    }
    return { ok: true, message: "Notifications are on. You'll get pings meant for you." }
  } catch (e) {
    if (e?.message === 'timeout') { logPushError(step, 'timeout'); return { ok: false, message: "Couldn't reach the notification service. Check your internet and try again." } }
    const why = `${step}: ${String(e?.message || e || 'unknown')}`.slice(0, 160)
    logPushError(step, e)
    try { console.error('enableNotifications', e) } catch { /* ignore */ }
    return { ok: false, message: `Couldn't turn notifications on (${why}). Close the app fully, reopen it, and try again. If it keeps failing, screenshot this for Khushi.` }
  }
}

/** Is this phone really registered to receive pushes? */
export async function pushStatus() {
  if (notificationState() !== 'granted') return 'off'
  try {
    const OneSignal = await withTimeout(initOneSignal(), 8000)
    const sub = OneSignal.User.PushSubscription
    for (let i = 0; i < 10 && !(sub.id && sub.optedIn); i++) await new Promise(r => setTimeout(r, 500))
    return sub.id && sub.optedIn ? 'on' : 'half'
  } catch { return 'half' }
}

// Kept for older imports.
export const askForPushPermission = enableNotifications
