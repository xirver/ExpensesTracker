import { useState, useMemo } from 'react'
import { api } from '../api'
import { fmt, monthName, txYear, txMonth } from '../utils'

function ProgressBar({ actual, budget }) {
  if (!budget) return <span style={{ color: 'var(--text2)', fontSize: 11 }}>Nessun budget</span>
  const pct = Math.min((actual / budget) * 100, 100)
  const color = pct >= 100 ? 'var(--negative)' : pct >= 80 ? 'var(--warning)' : 'var(--positive)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar-wrap" style={{ flex: 1 }}>
        <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, minWidth: 34 }}>{Math.round(pct)}%</span>
    </div>
  )
}

export default function Budget({ db, onRefresh }) {
  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [editing,  setEditing]  = useState(false)
  const [budgetEdits, setBudgetEdits] = useState({})
  const [saving, setSaving] = useState(false)

  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const budgets      = useMemo(() => db?.budgets || {}, [db])

  const expenseCategories = useMemo(
    () => (settings.categories || []).filter(c => c.type === 'Expense'),
    [settings]
  )
  const incomeCategories = useMemo(
    () => (settings.categories || []).filter(c => c.type === 'Income'),
    [settings]
  )

  function getActual(category) {
    const catDef = (settings.categories || []).find(c => c.name === category)
    const txType = catDef?.type === 'Income' ? 'Income' : 'Expense'
    return transactions
      .filter(tx => tx.category === category && tx.type === txType && txYear(tx) === String(year) && txMonth(tx) === selectedMonth)
      .reduce((s, tx) => s + tx.amount, 0)
  }

  function getBudget(category) {
    return budgets?.[year]?.[category]?.[selectedMonth - 1] ?? 0
  }

  function startEdit() {
    const edits = {}
    for (const cat of [...expenseCategories, ...incomeCategories]) {
      edits[cat.name] = String(getBudget(cat.name) || '')
    }
    setBudgetEdits(edits)
    setEditing(true)
  }

  async function saveEdits() {
    setSaving(true)
    try {
      const next = JSON.parse(JSON.stringify(budgets))
      if (!next[year]) next[year] = {}
      for (const [cat, val] of Object.entries(budgetEdits)) {
        const amount = parseFloat(val) || 0
        if (!next[year][cat]) next[year][cat] = Array(12).fill(0)
        next[year][cat][selectedMonth - 1] = amount
      }
      await api.updateBudget(next)
      onRefresh()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function renderSection(title, categories) {
    const rows = categories.map(cat => {
      const actual = getActual(cat.name)
      const budget = editing ? (parseFloat(budgetEdits[cat.name]) || 0) : getBudget(cat.name)
      const diff   = budget - actual
      return { cat, actual, budget, diff }
    }).filter(r => r.actual > 0 || r.budget > 0)

    if (rows.length === 0) return null

    const totalActual = rows.reduce((s, r) => s + r.actual, 0)
    const totalBudget = rows.reduce((s, r) => s + r.budget, 0)

    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            Totale: <strong style={{ color: 'var(--text)' }}>{fmt(totalActual)}</strong>
            {totalBudget > 0 && <> / budget {fmt(totalBudget)}</>}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Gruppo</th>
              <th style={{ textAlign: 'right' }}>Effettivo</th>
              <th style={{ textAlign: 'right' }}>Budget</th>
              <th style={{ textAlign: 'right' }}>Diff.</th>
              <th style={{ width: 180 }}>Avanzamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cat, actual, budget, diff }) => (
              <tr key={cat.name}>
                <td>{cat.name}</td>
                <td><span style={{ fontSize: 11, color: 'var(--text2)' }}>{cat.group}</span></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(actual)}</td>
                <td style={{ textAlign: 'right' }}>
                  {editing ? (
                    <input
                      type="number" step="0.01" min="0"
                      value={budgetEdits[cat.name] ?? ''}
                      onChange={e => setBudgetEdits(b => ({ ...b, [cat.name]: e.target.value }))}
                      style={{ width: 90, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '3px 8px', textAlign: 'right', fontSize: 13 }}
                    />
                  ) : (
                    budget > 0 ? fmt(budget) : <span style={{ color: 'var(--text2)' }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', color: diff >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                  {budget > 0 ? fmt(diff) : '—'}
                </td>
                <td><ProgressBar actual={actual} budget={budget} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Budget {year}</div>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={saveEdits} disabled={saving}>{saving ? '...' : 'Salva'}</button>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={startEdit}>✏️ Modifica Budget</button>
        )}
      </div>

      <div className="month-tabs">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <button key={m} className={`month-tab ${m === selectedMonth ? 'active' : ''}`} onClick={() => setSelectedMonth(m)}>
            {monthName(m)}
          </button>
        ))}
      </div>

      {renderSection('Spese', expenseCategories)}
      {renderSection('Entrate', incomeCategories)}

      {!expenseCategories.some(c => getActual(c.name) > 0 || getBudget(c.name) > 0) &&
       !incomeCategories.some(c => getActual(c.name) > 0 || getBudget(c.name) > 0) && (
        <div className="card">
          <div className="empty">Nessun dato per {monthName(selectedMonth)} {year}. Aggiungi transazioni o imposta un budget.</div>
        </div>
      )}
    </div>
  )
}
