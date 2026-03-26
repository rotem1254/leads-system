const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const leadsRoutes = require('./routes/leads')

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.set('trust proxy', 1)

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)
app.use(express.json({ limit: '64kb' }))

app.use('/api/leads', leadsRoutes)

// Avoid __dirname (can be undefined in some module/bundling runtimes).
// Resolve a stable public directory whether started from repo root or /server.
const publicDirCandidates = [
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'server', 'public')
]
const publicDir =
  publicDirCandidates.find((p) => fs.existsSync(p)) ?? publicDirCandidates[0]
app.use(express.static(publicDir))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'leads-api' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
