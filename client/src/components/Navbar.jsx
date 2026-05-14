import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',                icon: '📊', label: 'Dashboard'     },
  { to: '/transactions',    icon: '📋', label: 'Transazioni'   },
  { to: '/analytics',       icon: '📈', label: 'Analisi Spese' },
  { to: '/budget',          icon: '🎯', label: 'Budget'        },
  { to: '/account-balance', icon: '🏦', label: 'Saldo Conto'   },
  { to: '/settings',        icon: '⚙️', label: 'Impostazioni'  },
]

export default function Navbar({ username, onLogout, collapsed, mobileOpen, onToggle, onMobileClose }) {
  const navClass = ['navbar', collapsed ? 'collapsed' : '', mobileOpen ? 'mobile-open' : ''].filter(Boolean).join(' ')

  return (
    <nav className={navClass}>
      <div className="navbar-header">
        <div className="navbar-logo">💸 Expenses</div>
        <button className="navbar-toggle" onClick={onToggle} title={collapsed ? 'Espandi' : 'Comprimi'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="navbar-nav">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={onMobileClose}
            title={collapsed ? label : undefined}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="navbar-footer">
        <span className="navbar-footer-user">{username}</span>
        <button className="btn-logout" onClick={onLogout} title="Esci">
          {collapsed ? '↩' : 'Esci'}
        </button>
      </div>
    </nav>
  )
}
