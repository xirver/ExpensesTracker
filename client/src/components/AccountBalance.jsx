import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt, fmtDate, accountBalance, currentBalance } from '../utils'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: payload[0].value >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
        Saldo: {fmt(payload[0].value)}
      </div>
    </div>
  )
}

export default function AccountBalance({ db }) {
  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const account      = useMemo(() => settings.accounts?.[0] || { name: 'Conto', startingBalance: 0 }, [settings])

  const ledger  = useMemo(() => accountBalance(transactions, account.startingBalance), [transactions, account])
  const balance = useMemo(() => currentBalance(transactions, account.startingBalance), [transactions, account])

  // Monthly balance for chart: sample last balance per month
  const chartData = useMemo(() => {
    const monthMap = {}
    for (const entry of ledger) {
      const key = entry.date?.slice(0, 7) // YYYY-MM
      if (key) monthMap[key] = entry.balance
    }
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, balance]) => {
        const [y, m] = key.split('-')
        return { label: `${m}/${y.slice(2)}`, balance }
      })
  }, [ledger])

  const displayLedger = useMemo(() => [...ledger].reverse(), [ledger])

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Saldo Conto — {account.name}</div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Saldo Attuale</div>
          <div className={`kpi-value ${balance >= 0 ? 'positive' : 'negative'}`}>{fmt(balance)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo Iniziale</div>
          <div className="kpi-value neutral">{fmt(account.startingBalance)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Variazione Totale</div>
          <div className={`kpi-value ${balance - account.startingBalance >= 0 ? 'positive' : 'negative'}`}>
            {fmt(balance - account.startingBalance)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Transazioni</div>
          <div className="kpi-value neutral">{ledger.length}</div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Andamento Saldo</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" stroke="var(--accent)" fill="url(#balGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        {displayLedger.length === 0 ? (
          <div className="empty">Nessuna transazione</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Importo</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {displayLedger.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
                    <td>{tx.description}</td>
                    <td style={{ color: 'var(--text2)' }}>{tx.category}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <span className={tx.type === 'Income' ? 'positive' : 'negative'}>
                        {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <span className={tx.balance >= 0 ? 'balance-positive' : 'balance-negative'}>
                        {fmt(tx.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
