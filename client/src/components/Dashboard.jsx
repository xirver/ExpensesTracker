import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import {
  fmt, monthlyBreakdown, expenseByGroup, expenseByCategory,
  ytdTotals, currentMonthTotals, currentBalance, PIE_COLORS, GROUP_COLORS, monthName
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 12 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {name}: {fmt(value)}
    </div>
  )
}

export default function Dashboard({ db }) {
  const now  = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const startingBal  = useMemo(() => settings.accounts?.[0]?.startingBalance || 0, [settings])

  const ytd      = useMemo(() => ytdTotals(transactions, year), [transactions, year])
  const thisMonth = useMemo(() => currentMonthTotals(transactions), [transactions])
  const balance  = useMemo(() => currentBalance(transactions, startingBal), [transactions, startingBal])
  const monthly  = useMemo(() => monthlyBreakdown(transactions, year), [transactions, year])
  const byGroup  = useMemo(() => expenseByGroup(transactions, year), [transactions, year])
  const byCategory = useMemo(() => expenseByCategory(transactions, year).slice(0, 8), [transactions])

  const thisMonthByCategory = useMemo(() => {
    const m = String(month).padStart(2, '0')
    return expenseByCategory(
      transactions.filter(tx => tx.date?.slice(0, 7) === `${year}-${m}`)
    )
  }, [transactions, year, month])

  // Balance over time (monthly)
  const balanceHistory = useMemo(() => {
    let bal = startingBal
    return monthly.map(m => {
      bal += m.income - m.expenses
      return { label: m.label, balance: Math.round(bal * 100) / 100 }
    })
  }, [monthly, startingBal])

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard {year}</div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Saldo Attuale"      value={fmt(balance)}           colorClass={balance >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Spese Mese Corrente" value={fmt(thisMonth.expenses)} colorClass="negative" sub={`Entrate: ${fmt(thisMonth.income)}`} />
        <KpiCard label="Spese YTD"          value={fmt(ytd.expenses)}      colorClass="negative" />
        <KpiCard label="Entrate YTD"        value={fmt(ytd.income)}        colorClass="positive" />
        <KpiCard label="Cashflow YTD"       value={fmt(ytd.cashflow)}      colorClass={ytd.cashflow >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* Monthly bar chart + pie */}
      <div className="charts-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Entrate vs Spese Mensili</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income"   name="Entrate" fill="var(--positive)" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Spese"   fill="var(--negative)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Spese per Gruppo (YTD)</div>
          {byGroup.length === 0 ? (
            <div className="empty">Nessun dato</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byGroup} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {byGroup.map((entry, i) => (
                    <Cell key={i} fill={GROUP_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Top categories */}
        <div className="card">
          <div className="card-title">Top Categorie di Spesa (YTD)</div>
          {byCategory.length === 0 ? (
            <div className="empty">Nessun dato</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Spesa" fill="var(--accent)" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Current month pie */}
        <div className="card">
          <div className="card-title">Spese per Categoria — {monthName(month)}</div>
          {thisMonthByCategory.length === 0 ? (
            <div className="empty">Nessun dato</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={thisMonthByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  innerRadius={30}
                  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                  fontSize={11}
                >
                  {thisMonthByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {thisMonthByCategory.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
              {thisMonthByCategory.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  {d.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balance trend */}
        <div className="card">
          <div className="card-title">Saldo Conto nel Tempo</div>
          <ResponsiveContainer width="100%" height={220}>
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
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" name="Saldo" stroke="var(--accent)" fill="url(#balGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
