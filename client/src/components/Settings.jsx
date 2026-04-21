import { useState, useMemo } from 'react'
import { api } from '../api'
import { fmt } from '../utils'

function AccountRow({ account, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(account.name)
  const [balance, setBalance] = useState(String(account.startingBalance))
  const [saving,  setSaving]  = useState(false)

  async function save() {
    const bal = parseFloat(balance)
    if (!name.trim() || isNaN(bal)) return
    setSaving(true)
    await onSave({ name: name.trim(), startingBalance: bal })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input
            className="form-control"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%' }}
            autoFocus
          />
        </td>
        <td>
          <input
            className="form-control"
            type="number"
            step="0.01"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            style={{ width: 140 }}
          />
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? '...' : 'Salva'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setName(account.name)
              setBalance(String(account.startingBalance))
              setEditing(false)
            }}>Annulla</button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{account.name}</td>
      <td>{fmt(account.startingBalance)}</td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑️</button>
        </div>
      </td>
    </tr>
  )
}

export default function Settings({ db, onRefresh }) {
  const settings = useMemo(() => db?.settings || {}, [db])
  const accounts = useMemo(() => settings.accounts || [], [settings])

  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newBal,  setNewBal]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function saveAccount(index, updated) {
    const next = accounts.map((a, i) => i === index ? updated : a)
    await api.updateSettings({ accounts: next })
    onRefresh()
  }

  async function deleteAccount(index) {
    if (accounts.length === 1) {
      setError('Devi avere almeno un conto.')
      return
    }
    if (!confirm(`Eliminare il conto "${accounts[index].name}"?`)) return
    const next = accounts.filter((_, i) => i !== index)
    await api.updateSettings({ accounts: next })
    onRefresh()
  }

  async function addAccount() {
    setError('')
    const bal = parseFloat(newBal)
    if (!newName.trim()) { setError('Inserisci il nome del conto.'); return }
    if (isNaN(bal))      { setError('Inserisci un saldo valido.'); return }
    if (accounts.find(a => a.name === newName.trim())) { setError('Nome conto già esistente.'); return }
    setSaving(true)
    const next = [...accounts, { name: newName.trim(), startingBalance: bal }]
    await api.updateSettings({ accounts: next })
    onRefresh()
    setNewName('')
    setNewBal('')
    setAdding(false)
    setSaving(false)
  }

  if (!db) return <div className="loading">Caricamento...</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Impostazioni</div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Conti</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setError('') }}>+ Aggiungi conto</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Saldo iniziale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, i) => (
                <AccountRow
                  key={i}
                  account={account}
                  onSave={updated => saveAccount(i, updated)}
                  onDelete={() => deleteAccount(i)}
                />
              ))}

              {adding && (
                <tr>
                  <td>
                    <input
                      className="form-control"
                      placeholder="es. Fineco"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      autoFocus
                    />
                  </td>
                  <td>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newBal}
                      onChange={e => setNewBal(e.target.value)}
                      style={{ width: 140 }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={addAccount} disabled={saving}>
                        {saving ? '...' : 'Aggiungi'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setError('') }}>Annulla</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          Il <strong>saldo iniziale</strong> è il saldo del conto prima della prima transazione registrata nell'app.
          Il saldo attuale viene calcolato aggiungendo/sottraendo tutte le transazioni successive.
        </div>
      </div>
    </div>
  )
}
