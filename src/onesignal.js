export function initOneSignal() {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    })
  })
}

export function askForPushPermission() {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission()
  })
}
