/**
 * Import transactions from "Expenses Tracker 2026.xlsx"
 * Usage: node import-excel.js <username>
 *
 * Requires: npm install xlsx
 */

const fs   = require('fs')
const path = require('path')

// Try to load xlsx
let XLSX
try {
  XLSX = require('xlsx')
} catch {
  console.error('Missing dependency. Run: npm install xlsx')
  process.exit(1)
}

const username = process.argv[2]
if (!username) {
  console.error('Usage: node import-excel.js <username>')
  process.exit(1)
}

const DATA_DIR  = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const EXCEL_FILE = path.join(__dirname, 'Expenses Tracker 2026.xlsx')

if (!fs.existsSync(EXCEL_FILE)) {
  console.error(`File not found: ${EXCEL_FILE}`)
  process.exit(1)
}

// Find user
const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
const user  = users.find(u => u.username === username)
if (!user) {
  console.error(`User "${username}" not found. Register first via the app.`)
  process.exit(1)
}

const DB_FILE = path.join(DATA_DIR, user.id, 'db.json')
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

// Parse Excel
const wb = XLSX.readFile(EXCEL_FILE)
const ws = wb.Sheets['Transactions']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })

// Find header row
let headerIdx = -1
for (let i = 0; i < rows.length; i++) {
  if (rows[i].includes('Date') && rows[i].includes('Category') && rows[i].includes('Amount')) {
    headerIdx = i
    break
  }
}

if (headerIdx === -1) {
  console.error('Could not find header row in Transactions sheet')
  process.exit(1)
}

const headers = rows[headerIdx]
const col = name => headers.indexOf(name)

const COL_DATE  = col('Date')
const COL_DESC  = col('Description')
const COL_CAT   = col('Category')
const COL_AMT   = col('Amount')
const COL_ACCT  = col('Account')
const COL_GRP   = col('Group')
const COL_VEND  = col('Vendor')
const COL_TAGS  = col('Tags')
const COL_TYPE  = col('Type')

const categoryMap = {}
for (const c of db.settings.categories) {
  categoryMap[c.name] = c
}

const transactions = []
let skipped = 0

for (let i = headerIdx + 1; i < rows.length; i++) {
  const row = rows[i]
  if (!row[COL_DATE] || !row[COL_DESC]) { skipped++; continue }

  // Parse date
  let dateStr = String(row[COL_DATE]).trim()
  // Handle Excel serial dates
  if (/^\d{5}$/.test(dateStr)) {
    const d = XLSX.SSF.parse_date_code(parseInt(dateStr))
    dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      dateStr = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`
    }
  }
  // Already YYYY-MM-DD — keep as is

  const rawAmt = parseFloat(String(row[COL_AMT]).replace(',', '.'))
  if (isNaN(rawAmt)) { skipped++; continue }

  const type   = rawAmt > 0 ? 'Income' : 'Expense'
  const amount = Math.abs(rawAmt)
  const cat    = String(row[COL_CAT] || '').trim()
  const group  = String(row[COL_GRP] || categoryMap[cat]?.group || '').trim()

  const tags = row[COL_TAGS] ? String(row[COL_TAGS]).split(',').map(t => t.trim()).filter(Boolean) : []

  transactions.push({
    id:          `import_${i}_${Date.now()}`,
    date:        dateStr,
    description: String(row[COL_DESC]).trim(),
    category:    cat,
    group,
    type,
    amount,
    account:     String(row[COL_ACCT] || 'Intesa San Paolo').trim(),
    vendor:      row[COL_VEND] ? String(row[COL_VEND]).trim() : '',
    tags,
    notes:       '',
    createdAt:   new Date().toISOString()
  })
}

// Deduplicate against existing transactions
const existingKeys = new Set(
  db.transactions.map(tx => `${tx.date}|${tx.description}|${tx.amount}`)
)
const newTxs = transactions.filter(tx => !existingKeys.has(`${tx.date}|${tx.description}|${tx.amount}`))

db.transactions = [...db.transactions, ...newTxs]
db.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

// Update account starting balance from One-time Setup sheet
try {
  const setupWs = wb.Sheets['One-time Setup']
  const setupRows = XLSX.utils.sheet_to_json(setupWs, { header: 1, raw: true })
  for (const row of setupRows) {
    if (row.includes('Intesa San Paolo')) {
      const idx = row.indexOf('Intesa San Paolo')
      const bal = parseFloat(row[idx + 1])
      if (!isNaN(bal)) {
        db.settings.accounts[0].startingBalance = bal
        console.log(`Starting balance set to €${bal}`)
      }
      break
    }
  }
} catch {}

// Import budgets from Budget sheet
try {
  const budgetWs = wb.Sheets['Budget']
  const budgetRows = XLSX.utils.sheet_to_json(budgetWs, { header: 1, raw: true })
  // Find header row (Type, Category, Group, Year, month columns...)
  let bHeaderIdx = -1
  for (let i = 0; i < budgetRows.length; i++) {
    if (budgetRows[i][0] === 'Type' && budgetRows[i][1] === 'Category') {
      bHeaderIdx = i
      break
    }
  }
  if (bHeaderIdx !== -1) {
    const year = new Date().getFullYear()
    if (!db.budgets[year]) db.budgets[year] = {}
    for (let i = bHeaderIdx + 1; i < budgetRows.length; i++) {
      const row = budgetRows[i]
      const cat = String(row[1] || '').trim()
      if (!cat || cat === 'Total') continue
      const monthly = []
      for (let m = 4; m <= 15; m++) {
        monthly.push(parseFloat(row[m]) || 0)
      }
      if (monthly.some(v => v > 0)) {
        db.budgets[year][cat] = monthly
      }
    }
    console.log(`Budget importato per ${Object.keys(db.budgets[year]).length} categorie`)
  }
} catch (e) {
  console.log('Budget import skipped:', e.message)
}

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))

console.log(`\n✅ Import completato!`)
console.log(`   Transazioni importate: ${newTxs.length}`)
console.log(`   Transazioni già presenti (skippate): ${transactions.length - newTxs.length}`)
console.log(`   Righe Excel non valide: ${skipped}`)
console.log(`\nApri l'app per vedere i dati.`)
