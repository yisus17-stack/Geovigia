import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertosAuditoria } from '../../lib/auditoria'
import type { Huerto } from '../../lib/huertos'

function AuditorDashboard() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuertosAuditoria().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar la bandeja de auditoría.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => {
    const pending = huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'activo').length
    const mapped = huertos.filter((huerto) => huerto.poligono).length
    const area = huertos.reduce((total, huerto) => total + (huerto.superficie_ha ?? 0), 0)
    return { pending, mapped, area }
  }, [huertos])

  return <AppLayout role="auditor">
    <header className="page-header"><div><p className="eyebrow">Auditor</p><h1>Revisiones</h1><p>Huertas disponibles para revisión desde la base de datos.</p></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="stat-grid"><div><b>{loading ? '—' : huertos.length}</b><span>Huertas disponibles</span></div><div><b>{loading ? '—' : summary.pending}</b><span>Con estado por revisar</span></div><div><b>{loading ? '—' : summary.mapped}</b><span>Polígonos delimitados</span></div><div><b>{loading ? '—' : `${summary.area.toFixed(2)} ha`}</b><span>Superficie registrada</span></div></section>
    <section className="section-header"><div><p className="eyebrow">Bandeja de trabajo</p><h2>Huertas registradas</h2></div></section>
    {loading && <p className="loading-state">Cargando registros desde Supabase…</p>}
    {!loading && !error && <div className="data-table"><div className="table-head"><span>Huerta</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado</span><span /></div>{huertos.map((huerto) => <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.cultivo}</span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span>{huerto.estado}</span><Link to={`/auditor/revisiones/${huerto.id}`}>Revisar →</Link></div>)}{huertos.length === 0 && <p className="empty-state">No hay huertas disponibles para tu cuenta de auditor.</p>}</div>}
  </AppLayout>
}

export default AuditorDashboard
