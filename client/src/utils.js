export function fmt(n, decimals = 2) {
  if (n == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n)
}

export function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
export function monthName(n) { return MONTH_NAMES[n - 1] || '' }

export function txYear(tx)  { return tx.date?.slice(0, 4) }
export function txMonth(tx) { return parseInt(tx.date?.slice(5, 7)) }

// Returns signed amount: positive for income, negative for expense
export function signedAmount(tx) {
  if (tx.type === 'Income') return tx.amount
  if (tx.type === 'Expense') return -tx.amount
  return 0 // Transfer
}

// Monthly summary: { month: 1..12, income, expenses, cashflow }[]
export function monthlyBreakdown(transactions, year) {
  const months = {}
  for (let m = 1; m <= 12; m++) {
    months[m] = { month: m, label: monthName(m), income: 0, expenses: 0, cashflow: 0 }
  }
  for (const tx of transactions) {
    if (txYear(tx) !== String(year)) continue
    const m = txMonth(tx)
    if (!months[m]) continue
    if (tx.type === 'Income')   months[m].income   += tx.amount
    if (tx.type === 'Expense')  months[m].expenses += tx.amount
  }
  for (const m of Object.values(months)) {
    m.cashflow = m.income - m.expenses
    m.income   = round2(m.income)
    m.expenses = round2(m.expenses)
    m.cashflow = round2(m.cashflow)
  }
  return Object.values(months)
}

// Expense by category group YTD
export function expenseByGroup(transactions, year) {
  const groups = {}
  for (const tx of transactions) {
    if (tx.type !== 'Expense') continue
    if (year && txYear(tx) !== String(year)) continue
    groups[tx.group] = round2((groups[tx.group] || 0) + tx.amount)
  }
  return Object.entries(groups).map(([name, value]) => ({ name, value }))
}

// Expense by category YTD
export function expenseByCategory(transactions, year) {
  const cats = {}
  for (const tx of transactions) {
    if (tx.type !== 'Expense') continue
    if (year && txYear(tx) !== String(year)) continue
    cats[tx.category] = round2((cats[tx.category] || 0) + tx.amount)
  }
  return Object.entries(cats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Running account balance
export function accountBalance(transactions, startingBalance) {
  const sorted = [...transactions]
    .filter(tx => tx.type !== 'Transfer')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  let balance = startingBalance
  return sorted.map(tx => {
    balance = round2(balance + signedAmount(tx))
    return { ...tx, balance }
  })
}

// Current account balance
export function currentBalance(transactions, startingBalance) {
  const entries = accountBalance(transactions, startingBalance)
  return entries.length ? entries[entries.length - 1].balance : startingBalance
}

// YTD totals
export function ytdTotals(transactions, year) {
  let income = 0, expenses = 0
  for (const tx of transactions) {
    if (txYear(tx) !== String(year)) continue
    if (tx.type === 'Income')  income   += tx.amount
    if (tx.type === 'Expense') expenses += tx.amount
  }
  return { income: round2(income), expenses: round2(expenses), cashflow: round2(income - expenses) }
}

// Current month totals
export function currentMonthTotals(transactions) {
  const now = new Date()
  const y = String(now.getFullYear())
  const m = now.getMonth() + 1
  let income = 0, expenses = 0
  for (const tx of transactions) {
    if (txYear(tx) !== y) continue
    if (txMonth(tx) !== m) continue
    if (tx.type === 'Income')  income   += tx.amount
    if (tx.type === 'Expense') expenses += tx.amount
  }
  return { income: round2(income), expenses: round2(expenses) }
}

function round2(n) { return Math.round(n * 100) / 100 }

// Budget vs actual for a given year/month
export function budgetVsActual(transactions, budgets, year, categories) {
  const monthIdx = Array.from({ length: 12 }, (_, i) => i) // 0..11
  const result = {}
  for (const cat of categories) {
    result[cat.name] = { category: cat.name, group: cat.group, type: cat.type, monthly: [] }
    for (let m = 1; m <= 12; m++) {
      const budget = budgets?.[year]?.[cat.name]?.[m - 1] ?? 0
      const actual = transactions
        .filter(tx => tx.category === cat.name && txYear(tx) === String(year) && txMonth(tx) === m)
        .reduce((s, tx) => s + tx.amount, 0)
      result[cat.name].monthly.push({ month: m, budget: round2(budget), actual: round2(actual) })
    }
  }
  return result
}

export const GROUP_COLORS = {
  'Fixed':          '#4f9cf9',
  'Discretionary':  '#f97316',
  'Giving':         '#a78bfa',
  'Active Income':  '#22c55e',
  'Passive Income': '#86efac',
  'Transfer':       '#94a3b8'
}

export const PIE_COLORS = ['#4f9cf9','#f97316','#a78bfa','#22c55e','#f43f5e','#eab308','#06b6d4','#ec4899']
