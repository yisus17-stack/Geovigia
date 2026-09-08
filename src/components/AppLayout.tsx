import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'
import sideImage from '../assets/side.png'
import { supabase } from '../lib/supabase'

type AppLayoutProps = { children: ReactNode }
type NavIcon = 'overview' | 'orchards' | 'add'

const links: { to: string; label: string; icon: NavIcon }[] = [
  { to: '/auditor', label: 'Inicio / Auditorías', icon: 'overview' },
  { to: '/auditor/huertas', label: 'Huertas', icon: 'orchards' },
  { to: '/auditor/huertas/nuevo', label: 'Registrar huerta', icon: 'add' },
]

const iconPaths: Record<NavIcon, string> = {
  overview: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  orchards: 'M4 5h16v14H4zM4 9h16M9 5v14',
  add: 'M12 5v14M5 12h14',
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  return <svg aria-hidden="true" className="nav-glyph" viewBox="0 0 24 24"><path d={iconPaths[icon]} /></svg>
}

function AppLayout({ children }: AppLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return <div className={`app-shell ${isOpen ? 'menu-open' : ''}`}>
    <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>Menú</button>
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-panel">
        <Link className="app-brand" to="/auditor" aria-label="GeoVigía, inicio"><img src={logoImage} alt="GeoVigía" /></Link>
        <nav className="app-nav" aria-label="Navegación de aplicación">
          {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/auditor'} onClick={() => setIsOpen(false)}><NavGlyph icon={link.icon} />{link.label}</NavLink>)}
        </nav>
        <div className="sidebar-scene" aria-label="Campo seguro, futuro sostenible"><img src={sideImage} alt="Campo seguro, futuro sostenible" /></div>
      </div>
    </aside>
    <main className="app-workspace">
      <header className="workspace-header">
        <label className="workspace-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar huerta, auditoría o expediente" aria-label="Buscar" /></label>
        <div className="workspace-profile"><span className="profile-dot">GV</span><span><b>GeoVigía</b><small>Auditor · Sesión activa</small></span><button className="header-signout" onClick={signOut}>Cerrar sesión</button></div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  </div>
}

export default AppLayout
