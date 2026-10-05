import { supabase } from './supabaseClient'
export { supabase }

export async function listAll(table, { ascending = true } = {}) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending })
  if (error) { console.error(table, error); return [] }
  return data
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select()
  if (error) { console.error(table, error); throw error }
  return data?.[0]
}

export async function updateRow(table, id, patch) {
  const { error } = await supabase.from(table).update(patch).eq('id', id)
  if (error) { console.error(table, error); throw error }
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) { console.error(table, error); throw error }
}

export async function getMeta(key, fallback) {
  const { data, error } = await supabase.from('app_meta').select('value').eq('key', key).maybeSingle()
  if (error || !data) return fallback
  return data.value
}

export async function setMeta(key, value) {
  const { error } = await supabase.from('app_meta').upsert({ key, value })
  if (error) console.error('setMeta', error)
}

/**
 * Push a notification. `recipients` is a list of full names from the roster,
 * or ['ALL'] for everyone. Inserting the row is enough: a database webhook
 * hands it to the notify-critical edge function, which calls OneSignal.
 */
export async function sendPing({ from, recipients, title, body, kind = 'general' }) {
  const list = (recipients || []).filter(Boolean)
  if (!list.length) return
  const { error } = await supabase.from('pings').insert({
    from_name: from || 'Someone', recipients: list, title, body, kind,
  })
  if (error) console.error('pings', error)
}
