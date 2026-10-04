import { getMe, slug } from './identity'

function withOneSignal(fn) {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(fn)
}

export function initOneSignal() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    })
    const me = getMe()
    if (me) await OneSignal.login(slug(me))
  })
}

// Ties this device's push subscription to a person, so pings can be sent
// to specific people instead of the whole floor.
export function linkDeviceTo(name) {
  if (!name) return
  withOneSignal(async (OneSignal) => {
    try { await OneSignal.login(slug(name)) } catch (e) { console.error('OneSignal login', e) }
  })
}

export function askForPushPermission() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission()
    const me = getMe()
    if (me) await OneSignal.login(slug(me))
  })
}
