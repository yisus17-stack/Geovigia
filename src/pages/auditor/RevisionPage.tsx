import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import { actualizarEstadoHuerto, getHuertoAuditoria } from '../../lib/auditoria'
import { downloadBase64File, generateAuditWithEve, type EveDocumentResult } from '../../lib/eve'
import { supabase } from '../../lib/supabase'
import type { Huerto } from '../../lib/huertos'
import { getExpedientResponse, saveAgromichAnalysis, type PersistedImage } from '../../lib/analisis'

const agromichApi = import.meta.env.DEV ? '/agromich-api' : import.meta.env.VITE_AGROMICH_API_URL

function parseImages(payload: unknown): PersistedImage[] {
  if (!payload || typeof payload !== 'object') return []
  const rows = (payload as { imagenes?: unknown }).imagenes
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const image = row as Record<string, unknown>
    const anio = Number(image.anio ?? image.year)
    if (!Number.isInteger(anio)) return []
    return [{
      anio,
      fuente: typeof image.fuente === 'string' ? image.fuente : undefined,
      fecha_escena: typeof image.fecha_escena === 'string' ? image.fecha_escena : null,
      nubosidad_porcentaje: typeof image.nubosidad_porcentaje === 'number' ? image.nubosidad_porcentaje : null,
      thumbnail_url: typeof image.thumbnail_url === 'string' ? image.thumbnail_url : undefined,
      tile_url_template: typeof image.tile_url_template === 'string' ? image.tile_url_template : undefined,
      bounds: Array.isArray(image.bounds) && image.bounds.every((value) => typeof value === 'number') ? image.bounds as number[] : undefined,
      ndvi_promedio: typeof image.ndvi_promedio === 'number' ? image.ndvi_promedio : undefined,
      respuesta_imagen: image,
    }]
  })
}

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
  const [analysisId, setAnalysisId] = useState('')
  const [expedientReady, setExpedientReady] = useState(false)

  useEffect(() => {
    let active = true
    void getHuertoAuditoria(id).then((row) => {
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
      const responsableRegistro = huerto.propietario || String(auth.user?.user_metadata?.full_name ?? auth.user?.email ?? 'Responsable del registro')
      const expedienteResponse = await fetch(`${agromichApi}/api/v1/expediente/generar-completo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_huerto: huerto.nombre,
          productor: responsableRegistro,
          municipio: huerto.municipio,
          cultivo: huerto.cultivo,
          geometry: huerto.poligono,
          anio_inicio: 2018,
          anio_fin: new Date().getFullYear(),
        }),
        signal: controller.signal,
      })
      if (!expedienteResponse.ok) {
        const detail = await expedienteResponse.text()
        throw new Error(`AgroMich rechazó el expediente (HTTP ${expedienteResponse.status}). ${detail.slice(0, 240)}`)
      }

      const expediente = await expedienteResponse.json()
      const imagesResponse = await fetch(`${agromichApi}/api/v1/expediente/imagenes-historicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry: huerto.poligono, anios: [2018, 2020, 2022, 2024, new Date().getFullYear()], cultivo: huerto.cultivo, visualizacion: 'rgb', mes_inicio: 1, mes_fin: 4 }),
        signal: controller.signal,
      })
      if (!imagesResponse.ok) throw new Error(`AgroMich rechazó las imágenes históricas (HTTP ${imagesResponse.status}).`)
      const imagesPayload = await imagesResponse.json()
      const savedAnalysisId = await saveAgromichAnalysis({
        huertoId: huerto.id,
        periodStart: 2018,
        periodEnd: new Date().getFullYear(),
        response: expediente,
        rawResponse: expediente,
        images: parseImages(imagesPayload),
      })
      setAnalysisId(savedAnalysisId)
      setExpedientReady(true)
      setAgentStatus('Expediente guardado en la base de datos.')
      return
      const document = await generateAuditWithEve(expediente, setAgentStatus, controller.signal)
      setDocumentResult(document)
      setAgentStatus(`Auditoría generada. El ${document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
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

  async function generatePdfFromSavedExpedient() {
    if (!analysisId) {
      setAgentError('Primero guarda el expediente de AgroMich.')
      return
    }
    setAgentRunning(true)
    setAgentError('')
    setDocumentResult(null)
    setAgentStatus('Leyendo expediente guardado...')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    try {
      const savedResponse = await getExpedientResponse(analysisId)
      const document = await generateAuditWithEve(savedResponse, setAgentStatus, controller.signal)
      setDocumentResult(document)
      setAgentStatus(`Auditoría generada. El ${document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
    } catch (cause) {
      const detail = controller.signal.aborted ? 'La generación tardó más de dos minutos.' : cause instanceof Error ? cause.message : 'No se pudo generar el documento.'
      setAgentError(detail)
      setAgentStatus('')
    } finally {
      window.clearTimeout(timeout)
      setAgentRunning(false)
    }
  }

  return <AppLayout breadcrumbCurrent={huerto?.nombre}>
    {loading && <p className="loading-state">Cargando huerta desde Supabase…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && huerto && <>
      <header className="page-header"><div><p className="eyebrow">Auditoría de huerta</p><h1>{huerto.nombre}</h1><p>{huerto.municipio} · {huerto.localidad} · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div></header>
      <TerritoryMap orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
      <section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Estado actual</dt><dd>{huerto.estado}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</dd></div></dl></div><form className="review-form" onSubmit={(event) => { void saveStatus(event) }}><p className="eyebrow">Control de auditoría</p><h2>Actualizar estado</h2><label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="requiere revisión">Requiere revisión</option><option value="requiere información">Requiere información</option></select></label><p>Este cambio se guardará en el campo <b>estado</b> de la tabla <b>huertos</b>.</p><button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar estado'}</button>{message && <p className="success-message" role="status">{message}</p>}</form></section>
      <section className="audit-request-panel"><div><p className="eyebrow">Agente Vigía</p><h2>Generar auditoría</h2><p>Se consulta el expediente geoespacial y después Vigía prepara el dictamen y el documento.</p></div><div><button className="button" type="button" onClick={() => { void generateAudit() }} disabled={agentRunning} data-agent-action="create-audit" data-huerto-id={huerto.id}>{agentRunning ? 'Generando auditoría…' : 'Analizar y guardar expediente →'}</button><button className="button button-secondary" type="button" onClick={() => { void generatePdfFromSavedExpedient() }} disabled={!expedientReady || agentRunning}>Generar PDF con Vigía →</button><small className="audit-pdf-note">{agentStatus || 'Guarda primero el expediente para habilitar el PDF.'}</small>{agentError && <p className="form-error" role="alert">{agentError}</p>}{documentResult && <button className="text-button" type="button" onClick={() => downloadBase64File(documentResult.contentBase64, documentResult.filename, documentResult.mediaType)}>Descargar {documentResult.mediaType === 'application/pdf' ? 'PDF' : 'Word'} →</button>}</div></section>
    </>}
  </AppLayout>
}

export default RevisionPage
