import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import { fmt, expenseByGroup, expenseByCategory, PIE_COLORS, GROUP_COLORS } from '../utils'

const PERIODS = [
  { id: 'month',   label: 'Mese'   },
  { id: '3months', label: '3 Mesi' },
  { id: '6months', label: '6 Mesi' },
  { id: 'year',    label: 'Anno'   },
  { id: 'custom',  label: 'Custom' },
]

function getDateRange(period, customFrom, customTo) {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  const y     = now.getFullYear()
  const m     = String(now.getMonth() + 1).padStart(2, '0')
  if (period === 'month')   return { from: `${y}-${m}-01`, to: today }
  if (period === '3months') { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().slice(0, 10), to: today } }
  if (period === '6months') { const d = new Date(now); d.setMonth(d.getMonth() - 6); return { from: d.toISOString().slice(0, 10), to: today } }
  if (period === 'year')    return { from: `${y}-01-01`, to: today }
  if (period === 'custom')  return { from: customFrom, to: customTo }
  return { from: '', to: '' }
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 12 }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {payload[0].name}: {fmt(payload[0].value)}
    </div>
  )
}

// ── Multi-select category dropdown ──────────────────────────────────────────
function CategoryFilter({ categories, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allSelected = selected.length === categories.length
  const label = allSelected
    ? 'Tutte le categorie'
    : selected.length === 0
      ? 'Nessuna categoria'
      : `${selected.length} categor${selected.length === 1 ? 'ia' : 'ie'}`

  function toggleAll() { onChange(allSelected ? [] : [...categories]) }
  function toggle(cat) {
    onChange(selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--text)', padding: '7px 14px',
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          minWidth: 200
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <span style={{ color: 'var(--text2)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 8, minWidth: 230,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 320, overflowY: 'auto'
        }}>
          {/* Seleziona / Deseleziona tutte */}
          <div style={{ display: 'flex', gap: 6, padding: '4px 6px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
            <button
              onClick={toggleAll}
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
            >
              {allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}
            </button>
          </div>

          {categories.map(cat => (
            <label key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
              borderRadius: 6, cursor: 'pointer', fontSize: 13,
              color: selected.includes(cat) ? 'var(--text)' : 'var(--text2)',
              background: selected.includes(cat) ? 'var(--surface2)' : 'transparent',
              transition: 'background 0.1s'
            }}>
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              {cat}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 1024)
  useEffect(() => {
    const fn = () => setIsNarrow(window.innerWidth <= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isNarrow
}

export default function Analytics({ db }) {
  const isMobile = useIsNarrow()
  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const accounts     = useMemo(() => settings.accounts || [], [settings])

  // All expense categories available
  const allExpenseCats = useMemo(
    () => (settings.categories || []).filter(c => c.type === 'Expense').map(c => c.name),
    [settings]
  )

  const [period,       setPeriod]       = useState('month')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [selectedAcct, setSelectedAcct] = useState('__all__')
  const [selectedCats, setSelectedCats] = useState(allExpenseCats)

  // Sync selectedCats when categories change (e.g. settings update)
  useEffect(() => { setSelectedCats(allExpenseCats) }, [allExpenseCats.join(',')])

  const filteredByAcct = useMemo(
    () => selectedAcct === '__all__' ? transactions : transactions.filter(tx => tx.account === selectedAcct),
    [transactions, selectedAcct]
  )

  const dateRange = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo])

  const filteredTx = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return []
    return filteredByAcct.filter(tx => {
      if (tx.date < dateRange.from || tx.date > dateRange.to) return false
      if (tx.type === 'Expense' && selectedCats.length > 0 && !selectedCats.includes(tx.category)) return false
      return true
    })
  }, [filteredByAcct, dateRange, selectedCats])

  const periodExpenses = useMemo(() => filteredTx.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [filteredTx])
  const periodIncome   = useMemo(() => filteredTx.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [filteredTx])
  const byGroup        = useMemo(() => expenseByGroup(filteredTx),                  [filteredTx])
  const byCategory     = useMemo(() => expenseByCategory(filteredTx).slice(0, 10),  [filteredTx])

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analisi Spese</div>
        {accounts.length > 1 && (
          <div className="period-tabs" style={{ marginBottom: 0 }}>
            <button className={`period-tab ${selectedAcct === '__all__' ? 'active' : ''}`} onClick={() => setSelectedAcct('__all__')}>Tutti</button>
            {accounts.map(a => (
              <button key={a.name} className={`period-tab ${selectedAcct === a.name ? 'active' : ''}`} onClick={() => setSelectedAcct(a.name)}>{a.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {/* Period tabs */}
        <div className="period-tabs" style={{ marginBottom: 0 }}>
          {PERIODS.map(p => (
            <button key={p.id} className={`period-tab ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {period === 'custom' && (
          <div className="custom-range">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        {/* Category multi-select */}
        <CategoryFilter
          categories={allExpenseCats}
          selected={selectedCats}
          onChange={setSelectedCats}
        />
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Spese periodo</div>
          <div className="kpi-value negative">{fmt(periodExpenses)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entrate periodo</div>
          <div className="kpi-value positive">{fmt(periodIncome)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cashflow periodo</div>
          <div className={`kpi-value ${periodIncome - periodExpenses >= 0 ? 'positive' : 'negative'}`}>
            {fmt(periodIncome - periodExpenses)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Transazioni</div>
          <div className="kpi-value neutral">{filteredTx.length}</div>
        </div>
      </div>

      {selectedCats.length === 0 ? (
        <div className="card"><div className="empty">Seleziona almeno una categoria per visualizzare i dati</div></div>
      ) : filteredTx.length === 0 ? (
        <div className="card"><div className="empty">Nessuna transazione nel periodo selezionato</div></div>
      ) : (
        <>
          <div className="charts-grid-2" style={{ marginBottom: 16 }}>
            {/* Pie by group */}
            <div className="card">
              <div className="card-title">Spese per Gruppo</div>
              {byGroup.length === 0 ? <div className="empty">Nessuna spesa</div> : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={byGroup} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        outerRadius={90} innerRadius={36}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false} fontSize={11}>
                        {byGroup.map((e, i) => <Cell key={i} fill={GROUP_COLORS[e.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
                    {byGroup.map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: GROUP_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        {d.name}: <strong style={{ color: 'var(--text)' }}>{fmt(d.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top categories bar */}
            <div className="card">
              <div className="card-title">Top Categorie di Spesa</div>
              {byCategory.length === 0 ? <div className="empty">Nessuna spesa</div> : (
                <ResponsiveContainer width="100%" height={Math.max(240, byCategory.length * 36)}>
                  <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 8, left: isMobile ? 4 : 90, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text2)', fontSize: isMobile ? 10 : 11 }} width={isMobile ? 75 : 90} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Spesa" fill="var(--accent)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category breakdown table */}
          <div className="card">
            <div className="card-title">Dettaglio per Categoria</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Gruppo</th>
                    <th style={{ textAlign: 'right' }}>Totale</th>
                    <th style={{ textAlign: 'right' }}>% sul totale spese</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map(cat => (
                    <tr key={cat.name}>
                      <td>{cat.name}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                        {settings.categories?.find(c => c.name === cat.name)?.group || ''}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="negative">{fmt(cat.value)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text2)' }}>
                        {periodExpenses > 0 ? `${((cat.value / periodExpenses) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
