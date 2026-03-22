function normalizePhone(raw) {
  if (raw == null) return ''
  return String(raw).replace(/[\s\-()]/g, '').trim()
}

function validateLeadBody(req, res, next) {
  const body = req.body || {}
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const phone = normalizePhone(body.phone)

  if (!full_name.length) {
    return res.status(400).json({ error: 'Missing required fields', field: 'full_name' })
  }
  if (!phone.length) {
    return res.status(400).json({ error: 'Missing required fields', field: 'phone' })
  }

  req.validatedLead = {
    full_name,
    phone,
    email:
      typeof body.email === 'string' && body.email.trim().length
        ? body.email.trim()
        : null,
    message:
      typeof body.message === 'string' && body.message.trim().length
        ? body.message.trim()
        : null,
    page_source:
      typeof body.page_source === 'string' && body.page_source.trim().length
        ? body.page_source.trim()
        : 'unknown'
  }

  next()
}

module.exports = {
  validateLeadBody,
  normalizePhone
}
