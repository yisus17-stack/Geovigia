import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'
import sideImage from '../assets/side.png'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

type AppLayoutProps = { role: UserRole; children: ReactNode }
type NavIcon = 'overview' | 'orchards' | 'add' | 'reviews' | 'file' | 'territory'

const links: Record<UserRole, { to: string; label: string; icon: NavIcon }[]> = {
  productor: [{ to: '/productor', label: 'Resumen', icon: 'overview' }, { to: '/productor/huertos', label: 'Mis huertas', icon: 'orchards' }],
  auditor: [{ to: '/auditor', label: 'Revisiones', icon: 'reviews' }],
  autoridad: [{ to: '/autoridad', label: 'Supervisión', icon: 'territory' }, { to: '/autoridad/expedientes', label: 'Expedientes', icon: 'file' }],
}

const iconPaths: Record<NavIcon, string> = {
  overview: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  orchards: 'M4 5h16v14H4zM4 9h16M9 5v14',
  add: 'M12 5v14M5 12h14',
  reviews: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h4',
  file: 'M7 3h7l4 4v14H7zM14 3v5h5M10 13h5M10 17h5',
  territory: 'M3 17l5-5 4 3 5-7 4 3v8H3z',
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  return <svg aria-hidden="true" className="nav-glyph" viewBox="0 0 24 24"><path d={iconPaths[icon]} /></svg>
}

function AppLayout({ role, children }: AppLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return <div className={`app-shell ${isOpen ? 'menu-open' : ''}`}>
    <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>Menú</button>
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-panel">
        <Link className="app-brand" to={`/${role}`} aria-label="GeoVigía, inicio"><img src={logoImage} alt="GeoVigía" /></Link>
        <nav className="app-nav" aria-label="Navegación de aplicación">
          {links[role].map((link) => <NavLink key={link.to} to={link.to} end={link.to === `/${role}`} onClick={() => setIsOpen(false)}><NavGlyph icon={link.icon} />{link.label}</NavLink>)}
        </nav>
        <div className="sidebar-scene" aria-label="Campo seguro, futuro sostenible"><img src={sideImage} alt="Campo seguro, futuro sostenible" /></div>
      </div>
    </aside>
    <main className="app-workspace">
      <header className="workspace-header">
        <label className="workspace-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar huerta, análisis o expediente" aria-label="Buscar" /></label>
        <div className="workspace-profile"><span className="profile-dot">GV</span><span><b>GeoVigía</b><small>{role} · Sesión activa</small></span><button className="header-signout" onClick={signOut}>Cerrar sesión</button></div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  </div>
}

export default AppLayout
