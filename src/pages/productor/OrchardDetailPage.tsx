import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import TerritoryMap from '../../components/map/TerritoryMap'
import { confirmAction, showError, showSuccess } from '../../lib/alerts'
import { getHuerto, solicitarAuditoria, type Huerto } from '../../lib/huertos'

function OrchardDetailPage() {
  const id = useParams().id ?? ''
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    let active = true
    void getHuerto(id).then((row) => { if (active) setHuerto(row) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const requestAudit = useCallback(async () => {
    if (!huerto || huerto.estado.toLowerCase() === 'pendiente') return
    const confirmed = await confirmAction('¿Solicitar auditoría?', `La huerta ${huerto.nombre} aparecerá con estado pendiente en la bandeja del auditor.`, 'Sí, solicitar auditoría')
    if (!confirmed) return
    setRequesting(true)
    try {
      const updated = await solicitarAuditoria(huerto.id)
      setHuerto(updated)
      await showSuccess('Auditoría solicitada', 'El productor y el auditor ya verán el estado Pendiente.')
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
          ? cause.message
          : 'La base de datos rechazó el cambio. Revisa los permisos de la tabla huertos.'
      await showError('No se pudo solicitar la auditoría', message)
    } finally {
      setRequesting(false)
    }
  }, [huerto])

  useEffect(() => {
    if (!huerto || huerto.estado.toLowerCase() === 'pendiente') return
    const promptKey = `audit-prompted-${huerto.id}`
    if (sessionStorage.getItem(promptKey)) return
    const prompt = window.setTimeout(() => {
      sessionStorage.setItem(promptKey, 'true')
      void requestAudit()
    }, 0)
    return () => window.clearTimeout(prompt)
  }, [huerto, requestAudit])

  if (loading) return <AppLayout role="productor"><p className="loading-state">Cargando huerta…</p></AppLayout>
  if (error || !huerto) return <AppLayout role="productor"><p className="form-error" role="alert">{error || 'No encontramos esta huerta.'}</p><Link className="button" to="/productor/huertos">Volver a mis huertas</Link></AppLayout>

  const pending = huerto.estado.toLowerCase() === 'pendiente'
  return <AppLayout role="productor">
    <header className="page-header"><div><p className="eyebrow">{huerto.cultivo} · {huerto.municipio}</p><h1>{huerto.nombre}</h1><p>{huerto.localidad}, Michoacán · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div><span className={pending ? 'badge badge-pending' : 'badge'}>{pending ? 'Auditoría pendiente' : huerto.estado}</span></header>
    <TerritoryMap orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
    <AgromichAnalysisPanel huertoId={huerto.id} />
    <section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Estado</dt><dd>{pending ? 'Auditoría pendiente' : huerto.estado}</dd></div></dl></div><div><p className="eyebrow">Documentos</p><h2>Expediente documental</h2><button className="button button-quiet" type="button">Subir documento</button></div></section>
    <section className="audit-request-panel"><div><p className="eyebrow">Auditoría</p><h2>{pending ? 'Tu solicitud está en revisión' : 'Solicita una revisión'}</h2><p>{pending ? 'El auditor ya puede ver esta huerta en su bandeja con estado Pendiente.' : 'Envía esta huerta a la bandeja del auditor para su revisión.'}</p></div><div><button className="button" type="button" onClick={() => { void requestAudit() }} disabled={requesting || pending}>{requesting ? 'Solicitando…' : pending ? 'Auditoría pendiente' : 'Solicitar auditoría →'}</button><small className="audit-pdf-note">El expediente PDF se añadirá cuando se conecte el agente de David.</small></div></section>
  </AppLayout>
}

export default OrchardDetailPage
