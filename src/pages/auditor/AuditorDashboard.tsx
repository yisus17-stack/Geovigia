import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertosAuditoria } from '../../lib/auditoria'
import { formatAuditStatus, formatCropName, formatHuertoDate, type Huerto } from '../../lib/huertos'

function HuertaRow({ huerto }: { huerto: Huerto }) {
  const status = huerto.estado.toLowerCase()
  return <div className="table-row">
    <b>{huerto.nombre}<small>{formatHuertoDate(huerto)}</small></b>
    <span>{huerto.municipio}<small>{huerto.localidad}</small></span>
    <span>{formatCropName(huerto.cultivo)}</span>
    <span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span>
    <span className={`status-chip ${status === 'pendiente' ? 'is-pending' : 'is-active'}`}>{formatAuditStatus(huerto.estado)}</span>
    <Link to={`/auditor/huertas/${huerto.id}`}>Ver predio →</Link>
  </div>
}

function AuditRow({ huerto, completed = false }: { huerto: Huerto; completed?: boolean }) {
  return <div className="table-row">
    <b>{huerto.nombre}<small>{formatHuertoDate(huerto)}</small></b>
    <span>{huerto.municipio}<small>{huerto.localidad}</small></span>
    <span>{formatCropName(huerto.cultivo)}</span>
    <span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span>
    <span className={`status-chip ${completed ? 'is-active' : 'is-pending'}`}>{completed ? 'Auditoría aprobada' : 'En revisión'}</span>
    <Link to={`/auditor/auditorias/${huerto.id}`}>{completed ? 'Ver auditoría →' : 'Abrir auditoría →'}</Link>
  </div>
}

function AuditorDashboard() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuertosAuditoria().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar los predios.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => {
    const pending = huertos.filter((huerto) => huerto.estado.toLowerCase() === 'pendiente')
    const completed = huertos.filter((huerto) => huerto.estado.toLowerCase() === 'aprobado')
    const mapped = huertos.filter((huerto) => huerto.poligono).length
    const area = huertos.reduce((total, huerto) => total + (huerto.superficie_ha ?? 0), 0)
    return { pending, completed, mapped, area }
  }, [huertos])

  return <AppLayout>
    <header className="page-header"><div><p className="eyebrow">Predios</p><h1>Seguimiento territorial</h1><p>Registra un predio, delimítalo y después consulta su evidencia o genera su auditoría.</p></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="stat-grid"><div><b>{loading ? '—' : huertos.length}</b><span>Predios registrados</span></div><div><b>{loading ? '—' : summary.mapped}</b><span>Polígonos delimitados</span></div><div><b>{loading ? '—' : `${summary.area.toFixed(2)} ha`}</b><span>Superficie registrada</span></div><div><b>{loading ? '—' : summary.pending.length}</b><span>Auditorías en revisión</span></div></section>
    <section className="section-header"><div><p className="eyebrow">Predios</p><h2>Predios registrados</h2><p>Abre un predio para editarlo, ver su mapa y consultar la evidencia satelital.</p></div><Link to="/auditor/huertas">Ver todos →</Link></section>
    {loading && <div className="data-table table-loading" role="status"><span aria-hidden="true" /><p>Cargando predios…</p></div>}
    {!loading && !error && <div className="data-table"><div className="table-head"><span>Predio</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado de auditoría</span><span /></div>{huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'aprobado').slice(0, 5).map((huerto) => <HuertaRow key={huerto.id} huerto={huerto} />)}{huertos.length === 0 && <p className="empty-state">Aún no hay predios registrados. Registra el primero para iniciar su seguimiento.</p>}</div>}
    {!loading && !error && summary.pending.length > 0 && <><section className="section-header"><div><p className="eyebrow">Auditorías en curso</p><h2>Auditorías pendientes</h2><p>Estos predios requieren continuar con la revisión y el informe técnico.</p></div><Link to="/auditor/huertas">Administrar predios →</Link></section><div className="data-table"><div className="table-head"><span>Predio</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado de auditoría</span><span /></div>{summary.pending.map((huerto) => <AuditRow key={huerto.id} huerto={huerto} />)}</div></>}
    {!loading && !error && summary.completed.length > 0 && <><section className="section-header"><div><p className="eyebrow">Auditorías concluidas</p><h2>Auditorías finalizadas</h2><p>Predios con expediente revisado y visto bueno registrado.</p></div></section><div className="data-table"><div className="table-head"><span>Predio</span><span>Municipio</span><span>Cultivo</span><span>Superficie</span><span>Estado de auditoría</span><span /></div>{summary.completed.map((huerto) => <AuditRow key={huerto.id} huerto={huerto} completed />)}</div></>}
  </AppLayout>
}

export default AuditorDashboard
