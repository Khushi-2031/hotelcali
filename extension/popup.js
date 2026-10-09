const SHEET = 'https://micaschoolofideas-my.sharepoint.com/personal/rajesh_nair_micamail_in/_layouts/15/Doc.aspx?sourcedoc=%7B378B0A86-79DC-4761-A2B8-C90B641C1355%7D&file=Schedule_Term-3_phase-2_September-28-1.xlsx&action=default&mobileredirect=true'
const $ = (id) => document.getElementById(id)
const show = (r) => {
  if (!r) { $('status').textContent = 'Not synced yet. First sync runs a minute after install, then hourly.'; return }
  const when = new Date(r.at).toLocaleString()
  $('status').className = r.ok ? '' : 'bad'
  $('status').textContent = r.ok
    ? `Last sync ${when}: ${r.changed ? 'timetable changed' : 'no changes'}. ${r.sessions} sessions, ${r.first} to ${r.last}.`
    : r.signedOut ? `Last try ${when}: signed out of MICA SharePoint. Open the timetable below and sign in.` : `Last try ${when} failed: ${r.error || 'status ' + r.status}`
}
chrome.storage.local.get('last').then(({ last }) => show(last))
$('go').onclick = async () => {
  $('go').disabled = true; $('go').textContent = 'Syncing…'
  show(await chrome.runtime.sendMessage({ target: 'background', type: 'syncNow' }))
  $('go').disabled = false; $('go').textContent = 'Sync now'
}
$('open').onclick = (e) => { e.preventDefault(); chrome.tabs.create({ url: SHEET }) }
