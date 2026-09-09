import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import TerritoryMap from '../../components/map/TerritoryMap'
import logoImage from '../../assets/logo.png'
import { confirmAction, showError, showSuccess } from '../../lib/alerts'
import { deleteHuerto, formatCropName, getHuerto, solicitarAuditoria, type Huerto } from '../../lib/huertos'

function HuertaDetailPage() {
  const id = useParams().id ?? ''
  const navigate = useNavigate()
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [requestingAudit, setRequestingAudit] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuerto(id).then((row) => { if (active) setHuerto(row) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function requestAudit() {
    if (!huerto || requestingAudit) return
    if (!huerto.poligono) {
      await showError('Falta el polígono', 'Delimita la huerta antes de enviarla a auditoría.')
      return
    }
    setRequestingAudit(true)
    try {
      const updated = await solicitarAuditoria(huerto.id)
      setHuerto(updated)
      await showSuccess('Enviada a auditoría', 'La huerta ya aparece en Auditorías pendientes.')
    } catch (cause) {
      await showError('No se pudo enviar a auditoría', cause instanceof Error ? cause.message : 'Intenta de nuevo.')
    } finally {
      setRequestingAudit(false)
    }
  }

  async function removeHuerta() {
    if (!huerto || deleting) return
    const confirmed = await confirmAction('¿Eliminar huerta?', `Se eliminará “${huerto.nombre}” y no se podrá recuperar desde GeoVigía.`, 'Sí, eliminar')
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteHuerto(huerto.id)
      await showSuccess('Huerta eliminada', 'El registro se eliminó correctamente.')
      navigate('/auditor/huertas', { replace: true })
    } catch (cause) {
      await showError('No se pudo eliminar', cause instanceof Error ? cause.message : 'Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <AppLayout><p className="loading-state">Cargando huerta…</p></AppLayout>
  if (error || !huerto) return <AppLayout><p className="form-error" role="alert">{error || 'No encontramos esta huerta.'}</p><Link className="button" to="/auditor/huertas">Volver a huertas</Link></AppLayout>

  const pending = huerto.estado.toLowerCase() === 'pendiente'
  return <AppLayout breadcrumbCurrent={huerto.nombre}>
    <header className="page-header orchard-detail-header"><div><p className="eyebrow">{formatCropName(huerto.cultivo)} · {huerto.municipio}</p><h1>{huerto.nombre}</h1><p>{huerto.localidad}, Michoacán · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div><aside aria-hidden="true"><img src={logoImage} alt="" /></aside></header>
    <section className="orchard-overview"><TerritoryMap orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} /><section className="orchard-info-section"><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{formatCropName(huerto.cultivo)}</dd></div><div><dt>Municipio</dt><dd>{huerto.municipio}</dd></div><div><dt>Localidad</dt><dd>{huerto.localidad ?? 'Sin especificar'}</dd></div><div><dt>Superficie</dt><dd>{huerto.superficie_ha === null ? 'Sin calcular' : `${huerto.superficie_ha.toFixed(2)} ha`}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Estado</dt><dd>{pending ? 'Auditoría pendiente' : huerto.estado}</dd></div></dl></section></section>
    <AgromichAnalysisPanel huertoId={huerto.id} />
    {!pending ? <section className="audit-request-panel"><div><p className="eyebrow">Auditoría · Paso 1 de 2</p><h2>Enviar a auditoría</h2><p>Cuando el predio esté listo, envíalo a la cola de auditorías pendientes.</p></div><div><button className="button" type="button" onClick={() => { void requestAudit() }} disabled={requestingAudit}>{requestingAudit ? 'Enviando a auditoría…' : 'Enviar a auditoría →'}</button><small className="audit-pdf-note">Después podrás generar el informe técnico.</small></div></section> : <section className="audit-request-panel"><div><p className="eyebrow">Auditoría · Paso 2 de 2</p><h2>Generar informe técnico</h2><p>El predio ya está en auditoría. Revisa la evidencia territorial y continúa al generador de Vigía para crear y descargar el documento.</p></div><div><Link className="button" to={`/auditor/auditorias/${huerto.id}`}>Generar informe →</Link><small className="audit-pdf-note">El informe se genera con los datos actuales de este predio.</small></div></section>}
    <div className="detail-actions"><Link className="button button-secondary" to={`/auditor/huertas/${huerto.id}/editar`}>Editar huerta</Link><button className="text-button danger-button" type="button" onClick={() => { void removeHuerta() }} disabled={deleting}>{deleting ? 'Eliminando…' : 'Eliminar huerta'}</button></div>
  </AppLayout>
}

export default HuertaDetailPage
