import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertos } from '../../lib/huertos'
import type { Huerto } from '../../lib/huertos'

function AuditorDashboard() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; void getHuertos().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las huertas.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const summary = useMemo(() => ({ pending: huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'activo').length, mapped: huertos.filter((huerto) => huerto.poligono).length, area: huertos.reduce((total, huerto) => total + (huerto.superficie_ha ?? 0), 0) }), [huertos])
  return <AppLayout><header className="page-header"><div><p className="eyebrow">Auditor</p><h1>Inicio / Auditorías</h1><p>Registra tus huertas, consulta evidencia territorial y genera informes técnicos preliminares con Vigía.</p></div><Link className="button" to="/auditor/huertas/nuevo">+ Registrar huerta</Link></header>{error && <p className="form-error" role="alert">{error}</p>}<section className="stat-grid"><div><b>{loading ? '—' : huertos.length}</b><span>Huertas registradas</span></div><div><b>{loading ? '—' : summary.pending}</b><span>Auditorías pendientes</span></div><div><b>{loading ? '—' : summary.mapped}</b><span>Polígonos delimitados</span></div><div><b>{loading ? '—' : `${summary.area.toFixed(2)} ha`}</b><span>Superficie registrada</span></div></section><section className="section-header"><div><p className="eyebrow">Bandeja de trabajo</p><h2>Huertas recientes</h2></div><Link to="/auditor/huertas">Ver todas →</Link></section>{loading && <p className="loading-state">Cargando registros desde Supabase…</p>}{!loading && !error && <div className="orchard-grid">{huertos.slice(0, 6).map((huerto) => <article className="orchard-summary" key={huerto.id}><div><p>{huerto.cultivo}</p><h3>{huerto.nombre}</h3><span>{huerto.municipio}, Michoacán · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span></div><span>{huerto.estado === 'pendiente' ? 'Auditoría pendiente' : huerto.poligono ? 'Polígono delimitado' : 'Polígono pendiente'}</span><Link to={`/auditor/huertas/${huerto.id}`}>Abrir huerta →</Link></article>)}{huertos.length === 0 && <article className="orchard-summary"><div><p>Sin registros</p><h3>Registra tu primera huerta</h3><span>Al guardarla aparecerá aquí y en el mapa.</span></div><Link to="/auditor/huertas/nuevo">Registrar primera huerta →</Link></article>}</div>}</AppLayout>
}

export default AuditorDashboard
