function adminAuth(req, res, next) {
  const configured = process.env.ADMIN_TOKEN
  if (!configured) {
    return res.status(503).json({
      error: 'Admin API not configured — set ADMIN_TOKEN in environment'
    })
  }

  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const token = bearer || (req.query.token && String(req.query.token))

  if (!token || token !== configured) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

module.exports = { adminAuth }
