import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'
import sideImage from '../assets/side.png'
import { supabase } from '../lib/supabase'

type AppLayoutProps = { children: ReactNode }
type NavIcon = 'overview' | 'orchards' | 'reviews'

const links: { to: string; label: string; icon: NavIcon }[] = [
  { to: '/auditor/huertas', label: 'Huertas', icon: 'orchards' },
  { to: '/auditor', label: 'Auditorías', icon: 'reviews' },
  { to: '/auditor/mapas', label: 'Mapas y evidencia', icon: 'overview' },
]

const iconPaths: Record<NavIcon, string> = {
  overview: 'M3 17l5-5 4 3 5-7 4 3v8H3z',
  orchards: 'M4 5h16v14H4zM4 9h16M9 5v14',
  reviews: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h4',
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  return <svg aria-hidden="true" className="nav-glyph" viewBox="0 0 24 24"><path d={iconPaths[icon]} /></svg>
}

function AppLayout({ children }: AppLayoutProps) {
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
        <div className="sidebar-scene" aria-label="Campo seguro, futuro sostenible"><img src={sideImage} alt="Campo seguro, futuro sostenible" /></div>
      </div>
    </aside>
    <main className="app-workspace">
      <header className="workspace-header">
        <div className="workspace-title"><b>GeoVigía</b><small>Auditoría territorial</small></div>
        <div className="workspace-profile"><span className="profile-dot">GV</span><span><b>Auditor</b><small>Plataforma de seguimiento</small></span><button className="header-signout" type="button" onClick={() => { void signOut() }}>Salir</button></div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  </div>
}

export default AppLayout
