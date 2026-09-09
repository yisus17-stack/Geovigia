import { Link, useLocation } from 'react-router-dom'

type BreadcrumbItem = { label: string; to?: string }

type BreadcrumbsProps = { currentLabel?: string }

function getItems(pathname: string, currentLabel?: string): BreadcrumbItem[] {
  if (pathname === '/auditor') return [{ label: 'Panel' }]
  if (pathname === '/auditor/huertas') return [{ label: 'Panel', to: '/auditor' }, { label: 'Huertas' }]
  if (pathname === '/auditor/huertas/nuevo') return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Huertas', to: '/auditor/huertas' },
    { label: 'Registrar huerta' },
  ]
  if (pathname.endsWith('/editar')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Huertas', to: '/auditor/huertas' },
    { label: currentLabel || 'Huerta', to: pathname.replace(/\/editar$/, '') },
    { label: 'Editar huerta' },
  ]
  if (pathname.startsWith('/auditor/huertas/')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Huertas', to: '/auditor/huertas' },
    { label: currentLabel || 'Huerta' },
  ]
  if (pathname === '/auditor/mapas') return [{ label: 'Panel', to: '/auditor' }, { label: 'Mapas y evidencia' }]
  if (pathname.startsWith('/auditor/auditorias/')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Auditorías', to: '/auditor' },
    { label: currentLabel || 'Huerta' },
  ]
  return []
}

function Breadcrumbs({ currentLabel }: BreadcrumbsProps) {
  const { pathname } = useLocation()
  const items = getItems(pathname, currentLabel)
  if (items.length === 0) return null

  return <nav className="breadcrumbs" aria-label="Migas de pan">
    <ol>
      {items.map((item, index) => <li key={`${item.label}-${index}`}>
        {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
      </li>)}
    </ol>
  </nav>
}

export default Breadcrumbs
