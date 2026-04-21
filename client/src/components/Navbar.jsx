import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',                label: '📊 Dashboard'      },
  { to: '/transactions',    label: '📋 Transazioni'    },
  { to: '/budget',          label: '🎯 Budget'         },
  { to: '/account-balance', label: '🏦 Saldo Conto'   },
]

export default function Navbar({ username, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">💸 Expenses</div>
      <div className="navbar-nav">
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            {label}
          </NavLink>
        ))}
      </div>
      <div className="navbar-footer">
        <span>{username}</span>
        <button className="btn-logout" onClick={onLogout}>Esci</button>
      </div>
    </nav>
  )
}
