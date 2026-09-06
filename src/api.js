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

export async function getMeta(key, fallback) {
  const { data, error } = await supabase.from('app_meta').select('value').eq('key', key).maybeSingle()
  if (error || !data) return fallback
  return data.value
}

export async function setMeta(key, value) {
  const { error } = await supabase.from('app_meta').upsert({ key, value })
  if (error) console.error('setMeta', error)
}
