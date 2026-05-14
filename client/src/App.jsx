import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './api'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Budget from './components/Budget'
import AccountBalance from './components/AccountBalance'
import Settings        from './components/Settings'
import Analytics       from './components/Analytics'
import { ToastContainer } from './components/Toast'

export default function App() {
  const [token,    setToken]   = useState(localStorage.getItem('et_token'))
  const [username, setUsername]= useState(localStorage.getItem('et_username') || '')
  const [db,       setDb]      = useState(null)
  const [loading,  setLoading] = useState(false)

  // Sidebar state
  const [collapsed,   setCollapsed]   = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [mobileOpen,  setMobileOpen]  = useState(false)

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      setMobileOpen(o => !o)
    } else {
      setCollapsed(c => {
        localStorage.setItem('sidebar_collapsed', String(!c))
        return !c
      })
    }
  }

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    function onResize() { if (window.innerWidth > 768) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
        <Navbar
          username={username}
          onLogout={handleLogout}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleSidebar}
          onMobileClose={() => setMobileOpen(false)}
        />

        {mobileOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
        )}

        <div className="main-wrap">
          {/* Mobile topbar */}
          <div className="mobile-topbar">
            <button className="hamburger" onClick={toggleSidebar}>☰</button>
            <span className="mobile-topbar-title">💸 Expenses</span>
          </div>

          <main className="main">
            {loading && !db ? (
              <div className="loading">Caricamento...</div>
            ) : (
              <Routes>
                <Route path="/"                element={<Dashboard      db={db} onRefresh={fetchData} />} />
                <Route path="/transactions"    element={<Transactions   db={db} onRefresh={fetchData} />} />
                <Route path="/analytics"       element={<Analytics      db={db} />} />
                <Route path="/budget"          element={<Budget         db={db} onRefresh={fetchData} />} />
                <Route path="/account-balance" element={<AccountBalance db={db} />} />
                <Route path="/settings"        element={<Settings       db={db} onRefresh={fetchData} />} />
                <Route path="*"                element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </main>
        </div>
      </div>
      <ToastContainer />
    </BrowserRouter>
  )
}
