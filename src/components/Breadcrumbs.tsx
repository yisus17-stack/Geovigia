import { Link, useLocation } from 'react-router-dom'

type BreadcrumbItem = { label: string; to?: string }

type BreadcrumbsProps = { currentLabel?: string }

function getItems(pathname: string, currentLabel?: string): BreadcrumbItem[] {
  if (pathname === '/auditor') return [{ label: 'Panel' }]
  if (pathname === '/auditor/huertas') return [{ label: 'Panel', to: '/auditor' }, { label: 'Predios' }]
  if (pathname === '/auditor/huertas/nuevo') return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Predios', to: '/auditor/huertas' },
    { label: 'Registrar predio' },
  ]
  if (pathname.endsWith('/editar')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Predios', to: '/auditor/huertas' },
    { label: currentLabel || 'Predio', to: pathname.replace(/\/editar$/, '') },
    { label: 'Editar predio' },
  ]
  if (pathname.startsWith('/auditor/huertas/')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Predios', to: '/auditor/huertas' },
    { label: currentLabel || 'Predio' },
  ]
  if (pathname === '/auditor/mapas') return [{ label: 'Panel', to: '/auditor' }, { label: 'Mapas y evidencia' }]
  if (pathname.startsWith('/auditor/auditorias/')) return [
    { label: 'Panel', to: '/auditor' },
    { label: 'Auditorías', to: '/auditor' },
    { label: currentLabel || 'Predio' },
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
