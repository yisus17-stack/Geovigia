import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertosAuditoria } from '../../lib/auditoria'
import type { Huerto } from '../../lib/huertos'

function HuertaRow({ huerto }: { huerto: Huerto }) {
  return <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.cultivo}</span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span>{huerto.estado}</span><Link to={`/auditor/huertas/${huerto.id}`}>Ver huerta →</Link></div>
}

function AuditorDashboard() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuertosAuditoria().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las huertas.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => {
    const pending = huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'activo')
    const mapped = huertos.filter((huerto) => huerto.poligono).length
    const area = huertos.reduce((total, huerto) => total + (huerto.superficie_ha ?? 0), 0)
    return { pending, mapped, area }
  }, [huertos])

  return <AppLayout>
    <header className="page-header"><div><p className="eyebrow">Huertas</p><h1>Seguimiento territorial</h1><p>Registra una huerta, delimítala y después consulta su evidencia o genera su auditoría.</p></div><Link className="button" to="/auditor/huertas/nuevo">+ Registrar huerta</Link></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="stat-grid"><div><b>{loading ? '—' : huertos.length}</b><span>Huertas registradas</span></div><div><b>{loading ? '—' : summary.mapped}</b><span>Polígonos delimitados</span></div><div><b>{loading ? '—' : `${summary.area.toFixed(2)} ha`}</b><span>Superficie registrada</span></div><div><b>{loading ? '—' : summary.pending.length}</b><span>Auditorías pendientes</span></div></section>
    <section className="section-header"><div><p className="eyebrow">Primer paso</p><h2>Huertas registradas</h2><p>Abre una huerta para editarla, ver su mapa y consultar la evidencia satelital.</p></div><Link to="/auditor/huertas">Ver todas →</Link></section>
    {loading && <p className="loading-state">Cargando registros desde Supabase…</p>}
    {!loading && !error && <div className="data-table"><div className="table-head"><span>Huerta</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado</span><span /></div>{huertos.slice(0, 5).map((huerto) => <HuertaRow key={huerto.id} huerto={huerto} />)}{huertos.length === 0 && <p className="empty-state">Aún no hay huertas registradas. Registra la primera para iniciar su seguimiento.</p>}</div>}
    {!loading && !error && summary.pending.length > 0 && <><section className="section-header"><div><p className="eyebrow">Segundo paso</p><h2>Auditorías pendientes</h2><p>Estas huertas ya requieren continuar con la revisión y el informe técnico.</p></div><Link to="/auditor/huertas">Administrar huertas →</Link></section><div className="data-table"><div className="table-head"><span>Huerta</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado</span><span /></div>{summary.pending.map((huerto) => <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.cultivo}</span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span>{huerto.estado}</span><Link to={`/auditor/auditorias/${huerto.id}`}>Abrir auditoría →</Link></div>)}</div></>}
  </AppLayout>
}

export default AuditorDashboard
