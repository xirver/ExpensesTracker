import { useState, useMemo } from 'react'
import { api } from '../api'
import { fmt, fmtDate, monthName } from '../utils'
import TransactionModal from './TransactionModal'

function GroupBadge({ group }) {
  const cls = {
    'Fixed':          'badge-fixed',
    'Discretionary':  'badge-discretionary',
    'Giving':         'badge-giving',
    'Active Income':  'badge-income',
    'Passive Income': 'badge-income',
    'Transfer':       'badge-transfer',
  }[group] || 'badge-fixed'
  return <span className={`badge ${cls}`}>{group}</span>
}

export default function Transactions({ db, onRefresh }) {
  const [modal,        setModal]   = useState(null)
  const [filterMonth,  setMonth]  = useState('')
  const [filterType,   setType]   = useState('')
  const [filterCat,    setCat]    = useState('')
  const [filterAcct,   setAcct]   = useState('')
  const [search,       setSearch] = useState('')
  const [deleting,  setDeleting]  = useState(null)

  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const accounts     = useMemo(() => settings.accounts || [], [settings])

  const years  = useMemo(() => [...new Set(transactions.map(tx => tx.date?.slice(0, 4)))].sort().reverse(), [transactions])
  const [filterYear, setYear] = useState(() => String(new Date().getFullYear()))

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterYear  && tx.date?.slice(0, 4) !== filterYear) return false
      if (filterMonth && tx.date?.slice(5, 7) !== filterMonth.padStart(2, '0')) return false
      if (filterType  && tx.type !== filterType) return false
      if (filterCat   && tx.category !== filterCat) return false
      if (filterAcct  && tx.account !== filterAcct) return false
      if (search) {
        const q = search.toLowerCase()
        if (!tx.description?.toLowerCase().includes(q) && !tx.category?.toLowerCase().includes(q) && !tx.vendor?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transactions, filterYear, filterMonth, filterType, filterCat, search])

  const totals = useMemo(() => {
    const income   = filtered.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0)
    return { income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100 }
  }, [filtered])

  const categories = useMemo(() => [...new Set(transactions.map(t => t.category))].sort(), [transactions])

  async function handleDelete(id) {
    if (!confirm('Eliminare questa transazione?')) return
    setDeleting(id)
    try {
      await api.deleteTransaction(id)
      onRefresh()
    } finally {
      setDeleting(null)
    }
  }

  function handleSaved() {
    setModal(null)
    onRefresh()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Transazioni</div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Aggiungi</button>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-label">Spese filtrate</div>
          <div className="kpi-value negative">{fmt(totals.expenses)}</div>
        </div>
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-label">Entrate filtrate</div>
          <div className="kpi-value positive">{fmt(totals.income)}</div>
        </div>
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-label">Cashflow filtrato</div>
          <div className={`kpi-value ${totals.income - totals.expenses >= 0 ? 'positive' : 'negative'}`}>
            {fmt(totals.income - totals.expenses)}
          </div>
        </div>
        <div className="kpi-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="kpi-label">Numero transazioni</div>
          <div className="kpi-value neutral">{filtered.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          className="form-control"
          style={{ minWidth: 200 }}
          placeholder="Cerca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterYear} onChange={e => setYear(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '7px 12px', fontSize: 13 }}>
          <option value="">Tutti gli anni</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setMonth(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '7px 12px', fontSize: 13 }}>
          <option value="">Tutti i mesi</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={String(m)}>{monthName(m)}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setType(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '7px 12px', fontSize: 13 }}>
          <option value="">Tutti i tipi</option>
          <option value="Expense">Spese</option>
          <option value="Income">Entrate</option>
          <option value="Transfer">Trasferimenti</option>
        </select>
        <select value={filterCat} onChange={e => setCat(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '7px 12px', fontSize: 13 }}>
          <option value="">Tutte le categorie</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {accounts.length > 1 && (
          <select value={filterAcct} onChange={e => setAcct(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '7px 12px', fontSize: 13 }}>
            <option value="">Tutti i conti</option>
            {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
        )}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">Nessuna transazione trovata</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th>Gruppo</th>
                  <th>Conto</th>
                  <th style={{ textAlign: 'right' }}>Importo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
                    <td>
                      <div>{tx.description}</div>
                      {tx.vendor && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{tx.vendor}</div>}
                      {tx.tags?.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{tx.tags.join(', ')}</div>
                      )}
                    </td>
                    <td>{tx.category}</td>
                    <td><GroupBadge group={tx.group} /></td>
                    <td style={{ color: 'var(--text2)' }}>{tx.account}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <span className={tx.type === 'Income' ? 'positive' : tx.type === 'Expense' ? 'negative' : ''}>
                        {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(tx)}>✏️</button>
                        <button className="btn btn-danger btn-sm" disabled={deleting === tx.id} onClick={() => handleDelete(tx.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <TransactionModal
          tx={modal === 'new' ? null : modal}
          settings={settings}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
