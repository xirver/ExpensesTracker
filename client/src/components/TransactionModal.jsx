import { useState } from 'react'
import { api } from '../api'

export default function TransactionModal({ tx, settings, onClose, onSaved }) {
  const isEdit = !!tx?.id

  const [form, setForm] = useState({
    date:        tx?.date        || new Date().toISOString().slice(0, 10),
    description: tx?.description || '',
    category:    tx?.category    || '',
    type:        tx?.type        || 'Expense',
    amount:      tx?.amount != null ? String(tx.amount) : '',
    account:     tx?.account     || settings?.accounts?.[0]?.name || '',
    fromAccount: tx?.fromAccount || settings?.accounts?.[0]?.name || '',
    toAccount:   tx?.toAccount   || settings?.accounts?.[1]?.name || settings?.accounts?.[0]?.name || '',
    vendor:      tx?.vendor      || '',
    tags:        tx?.tags        || [],
    notes:       tx?.notes       || '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const isTransfer  = form.type === 'Transfer'
  const categories  = (settings?.categories || []).filter(c => c.type === form.type)
  const accounts    = settings?.accounts || []
  const tags        = settings?.tags     || []

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'type') next.category = ''
      return next
    })
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  function groupFor(cat) {
    return settings?.categories?.find(c => c.name === cat)?.group || ''
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amount = parseFloat(form.amount)
    if (!form.date || !form.amount || isNaN(amount) || amount <= 0) {
      setError('Data e importo sono obbligatori')
      return
    }
    if (isTransfer) {
      if (form.fromAccount === form.toAccount) {
        setError('I due conti devono essere diversi')
        return
      }
    } else {
      if (!form.description || !form.category) {
        setError('Compila tutti i campi obbligatori')
        return
      }
    }

    setLoading(true)
    try {
      let payload
      if (isTransfer) {
        payload = {
          date:        form.date,
          description: form.description || `${form.fromAccount} → ${form.toAccount}`,
          category:    'Trasferimento',
          group:       'Trasferimento',
          type:        'Transfer',
          amount,
          account:     form.fromAccount,
          fromAccount: form.fromAccount,
          toAccount:   form.toAccount,
          tags:        [],
          notes:       form.notes,
        }
      } else {
        payload = {
          ...form,
          amount,
          group: groupFor(form.category)
        }
      }

      if (isEdit) {
        await api.updateTransaction(tx.id, payload)
      } else {
        await api.addTransaction(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit ? 'Modifica Transazione' : 'Nuova Transazione'}</div>
        <form onSubmit={submit}>

          {/* Type selector */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Expense', 'Income', 'Transfer'].map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)',
                    background: form.type === t ? 'var(--accent)' : 'var(--surface2)',
                    color: form.type === t ? '#fff' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}>
                  {t === 'Expense' ? 'Spesa' : t === 'Income' ? 'Entrata' : 'Trasferimento'}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-control" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Importo (€) *</label>
              <input className="form-control" type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {isTransfer ? (
            /* ── Transfer fields ── */
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Da conto *</label>
                  <select className="form-control" value={form.fromAccount} onChange={e => set('fromAccount', e.target.value)}>
                    {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">A conto *</label>
                  <select className="form-control" value={form.toAccount} onChange={e => set('toAccount', e.target.value)}>
                    {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrizione</label>
                <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder={`${form.fromAccount} → ${form.toAccount}`} />
              </div>
            </>
          ) : (
            /* ── Expense / Income fields ── */
            <>
              <div className="form-group">
                <label className="form-label">Descrizione *</label>
                <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="es. Supermercato Agugliano" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="">Seleziona...</option>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Conto</label>
                  <select className="form-control" value={form.account} onChange={e => set('account', e.target.value)}>
                    {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venditore</label>
                <input className="form-control" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="es. Esselunga" />
              </div>

              {tags.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Tag</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {tags.map(tag => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag)}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                          background: form.tags.includes(tag) ? 'var(--accent)' : 'var(--surface2)',
                          color: form.tags.includes(tag) ? '#fff' : 'var(--text2)',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600
                        }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '...' : isEdit ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
