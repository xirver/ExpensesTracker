import { useState, useEffect, useCallback } from 'react'

let toastFn = null

export function showToast(message, type = 'success') {
  if (toastFn) toastFn(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  toastFn = useCallback((message, type) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => () => { toastFn = null }, [])

  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          background: toast.type === 'error' ? '#2d1b24' : '#0f2d1f',
          border: `1px solid ${toast.type === 'error' ? 'var(--negative)' : 'var(--positive)'}`,
          color: toast.type === 'error' ? 'var(--negative)' : 'var(--positive)',
          borderRadius: 10,
          padding: '12px 18px',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 300,
        }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
