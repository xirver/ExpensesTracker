import { useState } from 'react'
import { api } from '../api'

export default function Login({ onLogin }) {
  const [mode, setMode]   = useState('login')
  const [user, setUser]   = useState('')
  const [pass, setPass]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? api.login : api.register
      const res = await fn(user, pass)
      onLogin(res.token, res.username)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-title">💸 Expenses Tracker</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-control" value={user} onChange={e => setUser(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>
        <div className="login-toggle">
          {mode === 'login' ? (
            <span>Non hai un account? <button onClick={() => setMode('register')}>Registrati</button></span>
          ) : (
            <span>Hai già un account? <button onClick={() => setMode('login')}>Accedi</button></span>
          )}
        </div>
      </div>
    </div>
  )
}
