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

/**
 * PINs live in a locked table that only these database functions can touch.
 * Returns { ok, missing } where missing=true means the PIN feature isn't set up
 * in Supabase yet (migration 004 not run), so check-in carries on without it.
 */
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const missing = error.code === 'PGRST202' || /function .* does not exist|Could not find the function/i.test(error.message || '')
    return { ok: false, missing, error }
  }
  return { ok: true, data }
}
export const hasPin = (name) => rpc('has_pin', { p_name: name })
export const setPin = (name, pin) => rpc('set_pin', { p_name: name, p_pin: pin })
export const checkPin = (name, pin) => rpc('check_pin', { p_name: name, p_pin: pin })
