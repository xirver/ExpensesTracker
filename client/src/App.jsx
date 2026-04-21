import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './api'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Budget from './components/Budget'
import AccountBalance from './components/AccountBalance'

export default function App() {
  const [token, setToken]   = useState(localStorage.getItem('et_token'))
  const [username, setUsername] = useState(localStorage.getItem('et_username') || '')
  const [db, setDb]         = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.getData()
      setDb(data)
    } catch {}
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handler = () => handleLogout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  function handleLogin(tok, user) {
    localStorage.setItem('et_token', tok)
    localStorage.setItem('et_username', user)
    setToken(tok)
    setUsername(user)
  }

  function handleLogout() {
    localStorage.removeItem('et_token')
    localStorage.removeItem('et_username')
    setToken(null)
    setUsername('')
    setDb(null)
  }

  if (!token) return <Login onLogin={handleLogin} />

  return (
    <BrowserRouter>
      <div className="layout">
        <Navbar username={username} onLogout={handleLogout} />
        <main className="main">
          {loading && !db ? (
            <div className="loading">Caricamento...</div>
          ) : (
            <Routes>
              <Route path="/"                element={<Dashboard      db={db} onRefresh={fetchData} />} />
              <Route path="/transactions"    element={<Transactions   db={db} onRefresh={fetchData} />} />
              <Route path="/budget"          element={<Budget         db={db} onRefresh={fetchData} />} />
              <Route path="/account-balance" element={<AccountBalance db={db} />} />
              <Route path="*"               element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </BrowserRouter>
  )
}
