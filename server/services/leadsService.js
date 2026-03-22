const { getSupabase } = require('../config/supabase')

function db() {
  const s = getSupabase()
  if (!s) {
    const err = new Error(
      'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE) to server/.env'
    )
    err.code = 'SUPABASE_NOT_CONFIGURED'
    throw err
  }
  return s
}

exports.createLead = async (data) => {
  const payload = {
    ...data,
    status: data.status || 'new',
    updated_at: new Date().toISOString()
  }
  const { data: rows, error } = await db()
    .from('leads')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return rows
}

exports.getLeads = async () => {
  const { data, error } = await db()
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

exports.updateLead = async (id, data) => {
  const payload = {
    ...data,
    updated_at: new Date().toISOString()
  }
  const { data: row, error } = await db()
    .from('leads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return row
}

exports.deleteLead = async (id) => {
  const { error } = await db().from('leads').delete().eq('id', id)
  if (error) throw error
  return { id, deleted: true }
}

exports.getLeadById = async (id) => {
  const { data, error } = await db()
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
