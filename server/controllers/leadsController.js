const leadsService = require('../services/leadsService')

function configErrorResponse(res, err) {
  if (err.code === 'SUPABASE_NOT_CONFIGURED') {
    return res.status(503).json({ error: 'Database not configured' })
  }
  return null
}

exports.createLead = async (req, res) => {
  try {
    const row = await leadsService.createLead({
      ...req.validatedLead,
      status: 'new'
    })
    res.status(201).json({ success: true, data: row })
  } catch (err) {
    const out = configErrorResponse(res, err)
    if (out) return out
    console.error('[createLead]', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.getLeads = async (req, res) => {
  try {
    const rows = await leadsService.getLeads()
    res.json({ success: true, data: rows })
  } catch (err) {
    const out = configErrorResponse(res, err)
    if (out) return out
    console.error('[getLeads]', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.getLead = async (req, res) => {
  try {
    const { id } = req.params
    const row = await leadsService.getLeadById(id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' })
    }
    const out = configErrorResponse(res, err)
    if (out) return out
    console.error('[getLead]', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params
    const allowed = ['status', 'full_name', 'phone', 'email', 'message', 'page_source']
    const patch = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k]
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    const row = await leadsService.updateLead(id, patch)
    res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Not found' })
    }
    const out = configErrorResponse(res, err)
    if (out) return out
    console.error('[updateLead]', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params
    await leadsService.deleteLead(id)
    res.json({ success: true, data: { id, deleted: true } })
  } catch (err) {
    const out = configErrorResponse(res, err)
    if (out) return out
    console.error('[deleteLead]', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}
