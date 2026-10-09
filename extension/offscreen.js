chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.target !== 'offscreen' || msg.type !== 'sync') return
  syncSchedule().then(reply, (e) => reply({ ok: false, error: String(e?.message || e) }))
  return true
})
