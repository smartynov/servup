import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'

const DATA_DIR = process.env.DATA_DIR || '/app/data'
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(`${DATA_DIR}/sync.db`)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS store (
    token TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

function getToken(req: express.Request): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7) || null
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Get synced data
app.get('/api/sync', (req, res) => {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const row = db.prepare('SELECT data, updated_at as updatedAt FROM store WHERE token = ?').get(token) as { data: string; updatedAt: number } | undefined
  if (!row) return res.status(404).json({ error: 'Not found' })

  res.json(row)
})

// Save synced data
app.put('/api/sync', (req, res) => {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data, updatedAt } = req.body
  if (!data || !updatedAt) return res.status(400).json({ error: 'Missing data or updatedAt' })

  db.prepare(`
    INSERT INTO store (token, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(token, data, updatedAt)

  res.json({ ok: true })
})

const PORT = parseInt(process.env.PORT || '3001')
app.listen(PORT, () => {
  console.log(`Sync server listening on port ${PORT}`)
})
