import { getMe, slug } from './identity'

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
        const me = getMe()
        if (me) await OneSignal.login(slug(me))
        resolve(OneSignal)
      } catch (e) {
        console.error('OneSignal init', e)
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
  try {
    const OneSignal = await withTimeout(initOneSignal(), 10000)
    await OneSignal.Notifications.requestPermission()
    if (Notification.permission !== 'granted') {
      return { ok: false, message: "You didn't allow notifications. Tap again and choose Allow." }
    }
    try { await OneSignal.User.PushSubscription.optIn() } catch { /* already opted in */ }
    const me = getMe()
    if (me) await OneSignal.login(slug(me))
    return { ok: true, message: "Notifications are on. You'll get pings meant for you." }
  } catch (e) {
    if (e?.message === 'timeout') return { ok: false, message: "Couldn't reach the notification service. Check your internet and try again." }
    return { ok: false, message: 'Something went wrong turning notifications on. Close the app, reopen it, and try again.' }
  }
}

// Kept for older imports.
export const askForPushPermission = enableNotifications
