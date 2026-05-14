import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import {
  fmt, monthlyBreakdown, expenseByCategory,
  ytdTotals, currentMonthTotals, totalBalance, PIE_COLORS, monthName
} from '../utils'

function KpiCard({ label, value, sub, colorClass }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass || ''}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
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

export default function Dashboard({ db }) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const allTransactions = useMemo(() => db?.transactions || [], [db])
  const settings        = useMemo(() => db?.settings || {}, [db])
  const accounts        = useMemo(() => settings.accounts || [], [settings])

  // Account filter
  const [selectedAcct, setSelectedAcct] = useState('__all__')
  const activeAccount = useMemo(() => accounts.find(a => a.name === selectedAcct), [accounts, selectedAcct])
  const transactions  = useMemo(
    () => selectedAcct === '__all__' ? allTransactions : allTransactions.filter(tx => tx.account === selectedAcct),
    [allTransactions, selectedAcct]
  )
  const accountsForBalance = useMemo(
    () => selectedAcct === '__all__' ? accounts : (activeAccount ? [activeAccount] : []),
    [accounts, selectedAcct, activeAccount]
  )

  // Overview KPIs (YTD)
  const ytd        = useMemo(() => ytdTotals(transactions, year), [transactions, year])
  const thisMonth  = useMemo(() => currentMonthTotals(transactions), [transactions])
  const balance    = useMemo(() => totalBalance(transactions, accountsForBalance), [transactions, accountsForBalance])
  const monthly    = useMemo(() => monthlyBreakdown(transactions, year), [transactions, year])
  const balanceHistory = useMemo(() => {
    const startBal = accountsForBalance.reduce((s, a) => s + a.startingBalance, 0)
    let bal = startBal
    return monthly.map(m => {
      bal = Math.round((bal + m.income - m.expenses) * 100) / 100
      return { label: m.label, balance: bal }
    })
  }, [monthly, accountsForBalance])

  // Current month pie
  const thisMonthByCategory = useMemo(() => {
    const m = String(month).padStart(2, '0')
    return expenseByCategory(transactions.filter(tx => tx.date?.slice(0, 7) === `${year}-${m}`))
  }, [transactions, year, month])

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-title">Dashboard {year}</div>
        {accounts.length > 1 && (
          <div className="period-tabs" style={{ marginBottom: 0 }}>
            <button className={`period-tab ${selectedAcct === '__all__' ? 'active' : ''}`} onClick={() => setSelectedAcct('__all__')}>Tutti</button>
            {accounts.map(a => (
              <button key={a.name} className={`period-tab ${selectedAcct === a.name ? 'active' : ''}`} onClick={() => setSelectedAcct(a.name)}>{a.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <KpiCard label="Saldo Attuale"        value={fmt(balance)}           colorClass={balance >= 0 ? 'positive' : 'negative'} />
        <KpiCard label={`Spese ${monthName(month)}`} value={fmt(thisMonth.expenses)} colorClass="negative" sub={`Entrate: ${fmt(thisMonth.income)}`} />
        <KpiCard label="Spese YTD"            value={fmt(ytd.expenses)}      colorClass="negative" />
        <KpiCard label="Entrate YTD"          value={fmt(ytd.income)}        colorClass="positive" />
        <KpiCard label="Cashflow YTD"         value={fmt(ytd.cashflow)}      colorClass={ytd.cashflow >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* ── Monthly bar + current month pie ── */}
      <div className="charts-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Entrate vs Spese Mensili</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income"   name="Entrate" fill="var(--positive)" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Spese"   fill="var(--negative)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Spese per Categoria — {monthName(month)}</div>
          {thisMonthByCategory.length === 0 ? <div className="empty">Nessun dato</div> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={thisMonthByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={75} innerRadius={28}
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false} fontSize={11}>
                    {thisMonthByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }}>
                {thisMonthByCategory.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Balance trend ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Saldo Conto nel Tempo</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={balanceHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="balance" name="Saldo" stroke="var(--accent)" fill="url(#balGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
