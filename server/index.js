const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 3002
const JWT_SECRET = process.env.JWT_SECRET || 'expenses-tracker-secret-2026'
const DATA_DIR = path.join(__dirname, '../data')

app.use(cors())
app.use(express.json())

// Serve built client in production
const clientDist = path.join(__dirname, '../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
}

// ── helpers ──────────────────────────────────────────────────────────────────

function usersFile() { return path.join(DATA_DIR, 'users.json') }
function dbFile(userId) { return path.join(DATA_DIR, userId, 'db.json') }

function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile(), 'utf8')) } catch { return [] }
}
function writeUsers(users) {
  fs.writeFileSync(usersFile(), JSON.stringify(users, null, 2))
}

function readDB(userId) {
  try { return JSON.parse(fs.readFileSync(dbFile(userId), 'utf8')) } catch { return null }
}
function writeDB(userId, data) {
  const dir = path.join(DATA_DIR, userId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(dbFile(userId), JSON.stringify(data, null, 2))
}

function defaultDB() {
  return {
    transactions: [],
    settings: {
      categories: [
        { name: 'Casa',          group: 'Fisse',          type: 'Expense'  },
        { name: 'Spesa',         group: 'Fisse',          type: 'Expense'  },
        { name: 'Utenze',        group: 'Fisse',          type: 'Expense'  },
        { name: 'Abbonamenti',   group: 'Fisse',          type: 'Expense'  },
        { name: 'Investimento',  group: 'Fisse',          type: 'Expense'  },
        { name: 'Benzina',       group: 'Fisse',          type: 'Expense'  },
        { name: 'Ristoranti',    group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Vestiti',       group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Giochi',        group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Libri',         group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Viaggi',        group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Salute',        group: 'Discrezionali',  type: 'Expense'  },
        { name: 'Regali',        group: 'Regali',         type: 'Expense'  },
        { name: 'Stipendio',     group: 'Entrate',        type: 'Income'   },
        { name: 'Trasferimento', group: 'Trasferimento',  type: 'Transfer' }
      ],
      categoryGroups: [
        { name: 'Fisse',          type: 'Expense'  },
        { name: 'Discrezionali',  type: 'Expense'  },
        { name: 'Regali',         type: 'Expense'  },
        { name: 'Entrate',        type: 'Income'   },
        { name: 'Trasferimento',  type: 'Transfer' }
      ],
      accounts: [
        { name: 'Intesa San Paolo', startingBalance: 0 }
      ],
      tags: ['tax', 'reimbursable']
    },
    budgets: {}
  }
}

// ── auth middleware ───────────────────────────────────────────────────────────

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Missing token' })
  try {
    const token = header.split(' ')[1]
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const users = readUsers()
  if (users.find(u => u.username === username)) return res.status(409).json({ error: 'Username taken' })
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const passwordHash = await bcrypt.hash(password, 10)
  const user = { id, username, passwordHash, createdAt: new Date().toISOString() }
  users.push(user)
  writeUsers(users)
  writeDB(id, defaultDB())
  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, username })
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  const users = readUsers()
  const user = users.find(u => u.username === username)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, username })
})

// ── data routes ───────────────────────────────────────────────────────────────

app.get('/api/data', auth, (req, res) => {
  const db = readDB(req.user.id)
  if (!db) return res.status(404).json({ error: 'Not found' })
  res.json(db)
})

// Transactions
app.post('/api/transactions', auth, (req, res) => {
  const db = readDB(req.user.id)
  const tx = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  }
  db.transactions.push(tx)
  // keep sorted by date descending
  db.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
  writeDB(req.user.id, db)
  res.json(tx)
})

app.put('/api/transactions/:id', auth, (req, res) => {
  const db = readDB(req.user.id)
  const idx = db.transactions.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  db.transactions[idx] = { ...db.transactions[idx], ...req.body }
  db.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
  writeDB(req.user.id, db)
  res.json(db.transactions[idx])
})

app.delete('/api/transactions/:id', auth, (req, res) => {
  const db = readDB(req.user.id)
  db.transactions = db.transactions.filter(t => t.id !== req.params.id)
  writeDB(req.user.id, db)
  res.json({ ok: true })
})

// Budget
app.put('/api/budget', auth, (req, res) => {
  const db = readDB(req.user.id)
  db.budgets = req.body
  writeDB(req.user.id, db)
  res.json(db.budgets)
})

// Settings
app.put('/api/settings', auth, (req, res) => {
  const db = readDB(req.user.id)
  db.settings = { ...db.settings, ...req.body }
  writeDB(req.user.id, db)
  res.json(db.settings)
})

// SPA fallback
app.get('*', (req, res) => {
  const index = path.join(clientDist, 'index.html')
  if (fs.existsSync(index)) res.sendFile(index)
  else res.status(404).send('Not found')
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
