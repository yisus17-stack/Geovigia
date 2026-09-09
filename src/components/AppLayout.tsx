import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'
import michoacanLogo from '../assets/mejor.png'
import { supabase } from '../lib/supabase'
import Breadcrumbs from './Breadcrumbs'

type AppLayoutProps = { children: ReactNode; breadcrumbCurrent?: string }
type NavIcon = 'overview' | 'orchards' | 'reviews' | 'settings'

const links: { to: string; label: string; icon: NavIcon }[] = [
  { to: '/auditor/huertas', label: 'Huertas', icon: 'orchards' },
  { to: '/auditor', label: 'Auditorías', icon: 'reviews' },
  { to: '/auditor/mapas', label: 'Mapas y evidencia', icon: 'overview' },
  { to: '/auditor/configuracion', label: 'Configuración', icon: 'settings' },
]

const iconPaths: Record<NavIcon, string> = {
  overview: 'M3 17l5-5 4 3 5-7 4 3v8H3z',
  orchards: 'M4 5h16v14H4zM4 9h16M9 5v14',
  reviews: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h4',
  settings: 'M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v2m0 14v2M5 5l1.5 1.5m11 11L19 19M3 12h2m14 0h2M5 19l1.5-1.5m11-11L19 5',
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  return <svg aria-hidden="true" className="nav-glyph" viewBox="0 0 24 24"><path d={iconPaths[icon]} /></svg>
}

function AppLayout({ children, breadcrumbCurrent }: AppLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return <div className={`app-shell ${isOpen ? 'menu-open' : ''}`}>
    <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>Menú</button>
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-panel">
        <Link className="app-brand" to="/auditor" aria-label="GeoVigía, inicio"><img src={logoImage} alt="GeoVigía" /></Link>
        <nav className="app-nav" aria-label="Navegación de Auditor">
          {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/auditor'} onClick={() => setIsOpen(false)}><NavGlyph icon={link.icon} />{link.label}</NavLink>)}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-dot">GV</span>
          <span><b>Auditor</b><small>Plataforma De Seguimiento</small></span>
          <button className="header-signout" type="button" onClick={() => { void signOut() }}>Salir</button>
        </div>
      </div>
    </aside>
    <main className="app-workspace">
      <header className="workspace-header institutional-header">
        <Link className="workspace-institutional-logos" to="/auditor" aria-label="Michoacán, panel de auditorías"><img src={michoacanLogo} alt="Michoacán" /></Link>
        <div className="workspace-title"><b>Plataforma de auditoría</b><small>Seguimiento territorial</small></div>
      </header>
      <div className="app-content"><Breadcrumbs currentLabel={breadcrumbCurrent} />{children}</div>
    </main>
  </div>
}

export default AppLayout
