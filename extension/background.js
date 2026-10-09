// Hotel Cali timetable sync: runs every hour while Chrome is open.
const ALARM = 'hc-sync'
const PERIOD_MIN = 60

const ensureAlarm = async () => {
  if (!(await chrome.alarms.get(ALARM))) chrome.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: PERIOD_MIN })
}
chrome.runtime.onInstalled.addListener(ensureAlarm)
chrome.runtime.onStartup.addListener(ensureAlarm)

// The parser needs DOMParser, which service workers don't have, so it runs in an offscreen page.
const ensureOffscreen = async () => {
  const has = await chrome.offscreen.hasDocument?.()
  if (!has) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['DOM_PARSER'], justification: 'Parse the timetable spreadsheet XML' })
}

let running = null
const runSync = async () => {
  if (running) return running
  running = (async () => {
    let result
    try {
      await ensureOffscreen()
      result = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'sync' })
    } catch (e) {
      result = { ok: false, error: String(e?.message || e) }
    }
    result = { ...result, at: new Date().toISOString() }
    const { last } = await chrome.storage.local.get('last')
    await chrome.storage.local.set({ last: result })

    chrome.action.setBadgeText({ text: result.ok ? '' : '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' })
    // Notify on a new problem (not every hour) and when the timetable changes.
    if (!result.ok && (last?.ok !== false || last?.signedOut !== result.signedOut)) {
      chrome.notifications.create('hc-err', {
        type: 'basic', iconUrl: 'icon.png', title: 'Hotel Cali timetable sync',
        message: result.signedOut ? 'Signed out of MICA SharePoint. Open the timetable in Chrome and sign in.' : `Sync failed: ${result.error || 'status ' + result.status}`,
      })
    } else if (result.ok && result.changed) {
      chrome.notifications.create('hc-chg', {
        type: 'basic', iconUrl: 'icon.png', title: 'Timetable updated',
        message: `${result.sessions} sessions, ${result.first} to ${result.last}`,
      })
    }
    return result
  })()
  try { return await running } finally { running = null }
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) runSync() })
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.target === 'background' && msg.type === 'syncNow') { runSync().then(reply); return true }
})
