import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import TerritoryMap from '../../components/map/TerritoryMap'
import { confirmAction, showError, showSuccess } from '../../lib/alerts'
import { deleteHuerto, getHuerto, type Huerto } from '../../lib/huertos'

function HuertaDetailPage() {
  const id = useParams().id ?? ''
  const navigate = useNavigate()
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuerto(id).then((row) => { if (active) setHuerto(row) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

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
    <header className="page-header"><div><p className="eyebrow">{huerto.cultivo} · {huerto.municipio}</p><h1>{huerto.nombre}</h1><p>{huerto.localidad}, Michoacán · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div><span className={pending ? 'badge badge-pending' : 'badge'}>{pending ? 'Auditoría pendiente' : huerto.estado}</span></header>
    <TerritoryMap orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
    <AgromichAnalysisPanel huertoId={huerto.id} />
    <section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Estado</dt><dd>{pending ? 'Auditoría pendiente' : huerto.estado}</dd></div></dl></div><div><p className="eyebrow">Documentos</p><h2>Expediente documental</h2><button className="button button-quiet" type="button">Subir documento</button></div></section>
    <section className="audit-request-panel"><div><p className="eyebrow">Auditoría</p><h2>Generar informe técnico</h2><p>Revisa la evidencia territorial y continúa al generador de Vigía para crear y descargar el documento.</p></div><div><Link className="button" to={`/auditor/auditorias/${huerto.id}`}>Abrir auditoría →</Link><small className="audit-pdf-note">El informe se genera con los datos actuales de esta huerta.</small></div></section>
    <div className="detail-actions"><Link className="button button-secondary" to={`/auditor/huertas/${huerto.id}/editar`}>Editar huerta</Link><button className="text-button danger-button" type="button" onClick={() => { void removeHuerta() }} disabled={deleting}>{deleting ? 'Eliminando…' : 'Eliminar huerta'}</button></div>
  </AppLayout>
}

export default HuertaDetailPage
