import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt, fmtDate, accountBalance, currentBalance, totalBalance, signedAmount } from '../utils'

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

function AccountView({ account, transactions, accounts, allLedger, total }) {
  const isTutti = !!allLedger

  const singleLedger = useMemo(
    () => !isTutti ? accountBalance(transactions, account.startingBalance, account.name) : [],
    [isTutti, transactions, account]
  )
  const singleBalance = useMemo(
    () => !isTutti ? currentBalance(transactions, account.startingBalance, account.name) : 0,
    [isTutti, transactions, account]
  )

  const ledger   = isTutti ? allLedger : singleLedger
  const balance  = isTutti ? total     : singleBalance
  const startBal = isTutti
    ? accounts.reduce((s, a) => s + a.startingBalance, 0)
    : account.startingBalance

  const displayLedger = useMemo(() => [...ledger].reverse(), [ledger])

  const chartData = useMemo(() => {
    const monthMap = {}
    for (const entry of ledger) {
      const key = entry.date?.slice(0, 7)
      if (key) monthMap[key] = entry.balance
    }
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bal]) => {
        const [y, m] = key.split('-')
        return { label: `${m}/${y.slice(2)}`, balance: bal }
      })
  }, [ledger])

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">{isTutti ? 'Saldo Totale' : 'Saldo Attuale'}</div>
          <div className={`kpi-value ${balance >= 0 ? 'positive' : 'negative'}`}>{fmt(balance)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo Iniziale</div>
          <div className="kpi-value neutral">{fmt(startBal)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Variazione</div>
          <div className={`kpi-value ${balance - startBal >= 0 ? 'positive' : 'negative'}`}>
            {fmt(balance - startBal)}
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
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" stroke="var(--accent)" fill="url(#balGrad)" strokeWidth={2} />
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
    </>
  )
}

export default function AccountBalance({ db }) {
  const transactions = useMemo(() => db?.transactions || [], [db])
  const settings     = useMemo(() => db?.settings || {}, [db])
  const accounts     = useMemo(() => settings.accounts || [{ name: 'Conto', startingBalance: 0 }], [settings])
  const total        = useMemo(() => totalBalance(transactions, accounts), [transactions, accounts])

  const [selectedName, setSelectedName] = useState('__all__')

  // Combined "Tutti" ledger across all accounts
  const allLedger = useMemo(() => {
    const startingBal = accounts.reduce((s, a) => s + a.startingBalance, 0)
    const sorted = [...transactions]
      .filter(tx => tx.type !== 'Transfer')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = startingBal
    return sorted.map(tx => {
      balance = Math.round((balance + signedAmount(tx)) * 100) / 100
      return { ...tx, balance }
    })
  }, [transactions, accounts])

  const activeAccount = useMemo(
    () => accounts.find(a => a.name === selectedName),
    [accounts, selectedName]
  )

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Saldo Conto</div>
      </div>

      {accounts.length > 1 && (
        <div className="month-tabs" style={{ marginBottom: 20 }}>
          <button
            className={`month-tab ${selectedName === '__all__' ? 'active' : ''}`}
            onClick={() => setSelectedName('__all__')}
          >
            Tutti
          </button>
          {accounts.map(a => (
            <button
              key={a.name}
              className={`month-tab ${selectedName === a.name ? 'active' : ''}`}
              onClick={() => setSelectedName(a.name)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {selectedName === '__all__' || accounts.length === 1
        ? <AccountView account={accounts.length === 1 ? accounts[0] : null} transactions={transactions} accounts={accounts} allLedger={accounts.length > 1 ? allLedger : null} total={total} />
        : <AccountView account={activeAccount} transactions={transactions} accounts={accounts} />
      }
    </div>
  )
}
