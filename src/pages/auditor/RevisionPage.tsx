import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import TerritoryMap from '../../components/map/TerritoryMap'
import { actualizarEstadoHuerto } from '../../lib/auditoria'
import { downloadBase64File, generateAuditWithEve, type EveDocumentResult } from '../../lib/eve'
import { guardarAuditoria } from '../../lib/auditorias'
import { supabase } from '../../lib/supabase'
import type { Huerto } from '../../lib/huertos'
import { getHuerto } from '../../lib/huertos'

const agromichApi = import.meta.env.DEV ? '/agromich-api' : import.meta.env.VITE_AGROMICH_API_URL

function RevisionPage() {
  const { id = '' } = useParams()
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [estado, setEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [agentStatus, setAgentStatus] = useState('')
  const [agentError, setAgentError] = useState('')
  const [agentRunning, setAgentRunning] = useState(false)
  const [documentResult, setDocumentResult] = useState<EveDocumentResult | null>(null)

  useEffect(() => {
    let active = true
    void getHuerto(id).then((row) => {
      if (!active) return
      setHuerto(row)
      setEstado(row.estado)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!huerto) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const updated = await actualizarEstadoHuerto(huerto.id, estado)
      setHuerto(updated)
      setEstado(updated.estado)
      setMessage('Estado actualizado en Supabase.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.')
    } finally {
      setSaving(false)
    }
  }

  async function requestAudit() {
    if (!huerto || huerto.estado.toLowerCase() === 'pendiente') return
    setSaving(true)
    setError('')
    try {
      const updated = await actualizarEstadoHuerto(huerto.id, 'pendiente')
      setHuerto(updated)
      setEstado(updated.estado)
      setMessage('La huerta quedó marcada para auditoría.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo marcar la auditoría.')
    } finally {
      setSaving(false)
    }
  }

  async function generateAudit() {
    if (!huerto) return
    if (!huerto.poligono) {
      setAgentError('Esta huerta necesita un polígono antes de generar el expediente.')
      return
    }
    if (!agromichApi) {
      setAgentError('Falta configurar VITE_AGROMICH_API_URL.')
      return
    }

    setAgentRunning(true)
    setAgentError('')
    setDocumentResult(null)
    setAgentStatus('Generando expediente geoespacial…')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)

    try {
      const { data: auth } = await supabase.auth.getUser()
      const responsable = String(auth.user?.user_metadata?.full_name ?? auth.user?.email ?? 'Responsable del registro')
      const anioFin = new Date().getFullYear()
      const expedienteResponse = await fetch(`${agromichApi}/api/v1/expediente/generar-completo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_huerto: huerto.nombre,
          productor: responsable,
          municipio: huerto.municipio,
          cultivo: huerto.cultivo,
          geometry: huerto.poligono,
          anio_inicio: 2018,
          anio_fin: anioFin,
        }),
        signal: controller.signal,
      })
      if (!expedienteResponse.ok) {
        const detail = await expedienteResponse.text()
        throw new Error(`AgroMich rechazó el expediente (HTTP ${expedienteResponse.status}). ${detail.slice(0, 240)}`)
      }

      const expediente = await expedienteResponse.json()
      if (!expediente?.expediente?.metadata_predio) {
        throw new Error(expediente?.expediente?.motivo ?? 'AgroMich no devolvió un expediente maestro válido.')
      }
      setAgentStatus('Expediente listo. Vigía está preparando la auditoría y el PDF…')
      const generation = await generateAuditWithEve(expediente, setAgentStatus, controller.signal)
      setDocumentResult(generation.document)
      if (!generation.evaluation) throw new Error('Vigía generó el documento, pero no entregó el dictamen estructurado para guardarlo.')
      await guardarAuditoria({
        huertoId: huerto.id,
        propietarioId: huerto.propietario_id,
        expediente,
        evaluation: generation.evaluation,
        document: generation.document,
      })
      setAgentStatus(`Auditoría generada y guardada. El ${generation.document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
    } catch (cause) {
      console.error('[Auditoría] Falló la generación:', cause)
      const detail = controller.signal.aborted
        ? 'La generación tardó más de dos minutos.'
        : cause instanceof Error ? cause.message : 'No se pudo generar la auditoría.'
      setAgentError(detail.includes('plantilla Word') ? 'El agente no tiene disponible la plantilla Word necesaria para crear el PDF.' : detail)
      setAgentStatus('')
    } finally {
      window.clearTimeout(timeout)
      setAgentRunning(false)
    }
  }

  return <AppLayout>
    {loading && <p className="loading-state">Cargando huerta desde Supabase…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && huerto && <>
      <header className="page-header"><div><p className="eyebrow">Revisión de huerta</p><h1>{huerto.nombre}</h1><p>{huerto.municipio} · {huerto.localidad} · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div></header>
      <TerritoryMap allOrchards orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
      <AgromichAnalysisPanel huertoId={huerto.id} />
      <section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Estado actual</dt><dd>{huerto.estado}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</dd></div></dl></div><form className="review-form" onSubmit={(event) => { void saveStatus(event) }}><p className="eyebrow">Panel de revisión</p><h2>Actualizar estado</h2><label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="requiere revisión">Requiere revisión</option><option value="requiere información">Requiere información</option></select></label><p>Este cambio se guardará en el campo <b>estado</b> de la tabla <b>huertos</b>.</p><button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar estado'}</button>{message && <p className="success-message" role="status">{message}</p>}</form></section>
      <section className="audit-request-panel"><div><p className="eyebrow">Auditoría técnica</p><h2>Revisión de la huerta</h2><p>El Auditor administra el predio, consulta la evidencia y genera el informe preliminar.</p></div><div><div className="button-group"><Link className="button button-quiet" to={`/auditor/huertas/${huerto.id}/editar`}>Editar huerta</Link><button className="button button-quiet" type="button" onClick={() => { void requestAudit() }} disabled={saving || huerto.estado.toLowerCase() === 'pendiente'}>{huerto.estado.toLowerCase() === 'pendiente' ? 'Auditoría pendiente' : 'Solicitar auditoría'}</button><button className="button" type="button" onClick={() => { void generateAudit() }} disabled={agentRunning}>{agentRunning ? 'Generando auditoría…' : 'Generar con Vigía →'}</button></div><small className="audit-pdf-note">{agentStatus || 'La generación puede tardar hasta dos minutos.'}</small>{agentError && <p className="form-error" role="alert">{agentError}</p>}{documentResult && <button className="text-button" type="button" onClick={() => downloadBase64File(documentResult.contentBase64, documentResult.filename, documentResult.mediaType)}>Descargar {documentResult.mediaType === 'application/pdf' ? 'PDF' : 'Word'} →</button>}</div></section>
    </>}
  </AppLayout>
}

export default RevisionPage
