import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import { getHuertos, type Huerto } from '../../lib/huertos'

function ProductorDashboard() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuertos().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus datos.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => {
    const hectares = huertos.reduce((total, huerto) => total + (huerto.superficie_ha ?? 0), 0)
    const mapped = huertos.filter((huerto) => huerto.poligono).length
    const pending = huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'activo').length
    return { hectares, mapped, pending }
  }, [huertos])

  const firstHuerto = huertos[0]

  return <AppLayout role="productor">
    <header className="page-header producer-summary-header"><div><p className="eyebrow">Productor</p><h1>Resumen de huertas</h1><p>Consulta tus predios, polígonos y evidencia territorial en un solo lugar.</p></div><Link className="button" to="/productor/huertos/nuevo">+ Registrar huerta</Link></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="stat-grid"><div><b>{loading ? '—' : huertos.length}</b><span>Huertas registradas</span></div><div><b>{loading ? '—' : `${summary.hectares.toFixed(2)} ha`}</b><span>Superficie registrada</span></div><div><b>{loading ? '—' : summary.mapped}</b><span>Polígonos delimitados</span></div><div><b>{loading ? '—' : summary.pending}</b><span>Por revisar</span></div></section>
    <section className="section-header producer-map-heading"><div><p className="eyebrow">Vista territorial</p><h2>Huertas registradas</h2><p>{loading ? 'Cargando polígonos guardados…' : huertos.length ? `El mapa muestra ${huertos.length} huerta(s) guardada(s) en tu cuenta.` : 'Aún no hay huertas registradas.'}</p></div>{firstHuerto ? <Link to={`/productor/huertos/${firstHuerto.id}/editar`}>Editar primera huerta →</Link> : <Link to="/productor/huertos/nuevo">Registrar primera huerta →</Link>}</section>
    <TerritoryMap label="Resumen territorial de las huertas" />
    <section className="section-header"><div><p className="eyebrow">Bandeja de trabajo</p><h2>Mis huertas</h2></div><Link to="/productor/huertos">Ver todas →</Link></section>
    {loading && <p className="loading-state">Cargando huertas desde Supabase…</p>}
    {!loading && !error && <div className="orchard-grid">{huertos.map((huerto) => <article className="orchard-summary" key={huerto.id}><div><p>{huerto.cultivo}</p><h3>{huerto.nombre}</h3><span>{huerto.municipio}, Michoacán · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span></div><span>{huerto.poligono ? 'Polígono delimitado' : 'Polígono pendiente'}</span><Link to={`/productor/huertos/${huerto.id}/editar`}>Editar huerta →</Link></article>)}{huertos.length === 0 && <article className="orchard-summary"><div><p>Sin registros</p><h3>Registra tu primera huerta</h3><span>Al guardarla aparecerá aquí y en el mapa.</span></div><Link to="/productor/huertos/nuevo">Registrar huerta →</Link></article>}</div>}
  </AppLayout>
}

export default ProductorDashboard
