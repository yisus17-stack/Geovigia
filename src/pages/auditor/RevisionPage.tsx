import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import logoImage from '../../assets/logo.png'
import { actualizarEstadoHuerto, getHuertoAuditoria } from '../../lib/auditoria'
import { downloadBase64File, generateAuditWithEve, type EveDocumentResult } from '../../lib/eve'
import { supabase } from '../../lib/supabase'
import { formatCropName, formatHuertoDate, type Huerto } from '../../lib/huertos'
import { getExpedientResponse, getLatestSavedExpedient, saveAgromichAnalysis, type PersistedImage } from '../../lib/analisis'
import { closeLoading, showError, showLoading, showSuccess, updateLoading } from '../../lib/alerts'

const agromichApi = '/agromich-api'

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

function buildPdfExpedient(expedient: unknown, huerto: Huerto) {
  const source = expedient !== null && typeof expedient === 'object' && !Array.isArray(expedient)
    ? expedient as Record<string, unknown>
    : {}
  const analysis = source.expediente !== null && typeof source.expediente === 'object' && !Array.isArray(source.expediente)
    ? source.expediente as Record<string, unknown>
    : source

  return {
    ...analysis,
    datos_predio: {
      expediente_no: `VIGIA/AMB/${huerto.id.slice(0, 8).toUpperCase()}`,
      propietario: huerto.propietario,
      nombre_huerto: huerto.nombre,
      municipio: huerto.municipio,
      localidad: huerto.localidad,
      estado: 'Michoacán',
      cultivo_declarado: huerto.cultivo,
      superficie_hectareas: huerto.superficie_ha,
    },
  }
}

function RevisionPage() {
  const { id = '' } = useParams()
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [agentStatus, setAgentStatus] = useState('')
  const [agentError, setAgentError] = useState('')
  const [agentRunning, setAgentRunning] = useState(false)
  const [documentResult, setDocumentResult] = useState<EveDocumentResult | null>(null)
  const [analysisId, setAnalysisId] = useState('')
  const [expedientReady, setExpedientReady] = useState(false)
  const [approvingAudit, setApprovingAudit] = useState(false)
  const generatePdfRef = useRef<() => void>(() => {})

  useEffect(() => {
    let active = true
    void Promise.all([getHuertoAuditoria(id), getLatestSavedExpedient(id)]).then(([row, savedExpedient]) => {
      if (!active) return
      setHuerto(row)
      if (savedExpedient && !savedExpedient.requiresRefresh) {
        setAnalysisId(savedExpedient.analysisId)
        setExpedientReady(true)
        setAgentStatus('Expediente recuperado de la base de datos.')
      } else if (savedExpedient?.requiresRefresh) {
        setAgentStatus('Se modificaron datos del predio; genera un expediente actualizado.')
      }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  // Una auditoría aprobada conserva el acceso al documento; el cierre no debe bloquear su descarga.
  useEffect(() => {
    if (huerto?.estado.toLowerCase() !== 'aprobado') return
    const pdfButton = document.querySelector<HTMLButtonElement>('.audit-wizard .button-secondary')
    if (!pdfButton) return
    pdfButton.disabled = false
    pdfButton.onclick = () => { generatePdfRef.current() }
  }, [agentRunning, documentResult, huerto?.estado])

  async function generateAudit() {
    if (!huerto) return
    if (!huerto.poligono) {
      setAgentError('Esta huerta necesita un polígono antes de generar el expediente.')
      return
    }
    setAgentRunning(true)
    setAgentError('')
    setDocumentResult(null)
    setAgentStatus('Generando expediente geoespacial…')
    showLoading('Generando auditoría...', 'Estamos creando y guardando el expediente geoespacial.')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 300_000)

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
      setAgentStatus('Consultando imágenes históricas…')
      updateLoading('Consultando imágenes…')
      const imagesResponse = await fetch(`${agromichApi}/api/v1/expediente/imagenes-historicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry: huerto.poligono, anios: [2018, 2020, 2022, 2024, new Date().getFullYear()], cultivo: huerto.cultivo, visualizacion: 'rgb', mes_inicio: 1, mes_fin: 4 }),
        signal: controller.signal,
      })
      if (!imagesResponse.ok) throw new Error(`AgroMich rechazó las imágenes históricas (HTTP ${imagesResponse.status}).`)
      const imagesPayload = await imagesResponse.json()
      setAgentStatus('Guardando expediente en la base de datos…')
      updateLoading('Guardando expediente…')
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
      closeLoading()
      await showSuccess('Expediente listo', 'Ya puedes generar el PDF con Vigía.')
      return
      const document = await generateAuditWithEve(expediente, setAgentStatus, controller.signal)
      setDocumentResult(document)
      setAgentStatus(`Auditoría generada. El ${document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
    } catch (cause) {
      console.error('[Auditoría] Falló la generación:', cause)
      const detail = controller.signal.aborted
        ? 'La generación tardó más de cinco minutos.'
        : cause instanceof Error ? cause.message : 'No se pudo generar la auditoría.'
      setAgentError(detail.includes('plantilla Word') ? 'El agente no tiene disponible la plantilla Word necesaria para crear el PDF.' : detail)
      setAgentStatus('')
      closeLoading()
      void showError('No se pudo generar la auditoría', detail)
    } finally {
      window.clearTimeout(timeout)
      setAgentRunning(false)
    }
  }

  const generatePdfFromSavedExpedient = useCallback(async () => {
    if (!analysisId) {
      setAgentError('Primero guarda el expediente de AgroMich.')
      return
    }
    if (!huerto) return
    setAgentRunning(true)
    setAgentError('')
    setDocumentResult(null)
    setAgentStatus('Leyendo expediente guardado...')
    showLoading('Generando PDF...', 'Vigía está preparando el documento.')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 300_000)
    try {
      const savedResponse = await getExpedientResponse(analysisId)
      const document = await generateAuditWithEve(buildPdfExpedient(savedResponse, huerto), (status) => {
        setAgentStatus(status)
      }, controller.signal)
      setDocumentResult(document)
      setAgentStatus(`Auditoría generada. El ${document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
      closeLoading()
      await showSuccess('Documento listo', 'Ya puedes descargarlo.')
    } catch (cause) {
      const detail = controller.signal.aborted ? 'La generación tardó más de cinco minutos.' : cause instanceof Error ? cause.message : 'No se pudo generar el documento.'
      setAgentError(detail)
      setAgentStatus('')
      closeLoading()
      void showError('No se pudo generar el PDF', detail)
    } finally {
      window.clearTimeout(timeout)
      setAgentRunning(false)
    }
  }, [analysisId, huerto])

  async function approveAudit() {
    if (!huerto) return
    setApprovingAudit(true)
    setAgentError('')
    try {
      const updatedHuerto = await actualizarEstadoHuerto(huerto.id, 'aprobado')
      setHuerto(updatedHuerto)
      setAgentStatus('Auditoría aprobada. El predio ya cuenta con visto bueno.')
      await showSuccess('Auditoría aprobada', 'El predio recibió el visto bueno y el expediente queda cerrado.')
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'No pudimos aprobar la auditoría.'
      setAgentError(detail)
      void showError('No se pudo aprobar la auditoría', detail)
    } finally {
      setApprovingAudit(false)
    }
  }

  useEffect(() => {
    generatePdfRef.current = () => { void generatePdfFromSavedExpedient() }
  }, [generatePdfFromSavedExpedient])

  return <AppLayout breadcrumbCurrent={huerto?.nombre}>
    {loading && <p className="loading-state">Cargando predio…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && huerto && <>
      <header className="page-header audit-page-header"><div><p className="eyebrow">Auditoría de huerta</p><h1>{huerto.nombre}</h1><p>{huerto.municipio} · {huerto.localidad} · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div><aside aria-hidden="true"><img src={logoImage} alt="" /></aside></header>
      <TerritoryMap orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
      <section className="audit-record-info"><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{formatCropName(huerto.cultivo)}</dd></div><div><dt>Estado actual</dt><dd>{huerto.estado}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{formatHuertoDate(huerto)}</dd></div></dl></section>
      <section className="audit-request-panel audit-wizard"><div><p className="eyebrow">Agente Vigía</p><h2>Generar auditoría</h2><p>Completa los pasos en orden, revisa el documento y da el visto bueno final.</p></div><ol aria-label="Pasos para generar la auditoría"><li className={expedientReady ? 'is-complete' : agentRunning ? 'is-running' : ''}><span>1</span><div><b>Preparar expediente</b><small>Analiza la evidencia geoespacial y guárdala.</small></div><button className="button" type="button" onClick={() => { void generateAudit() }} disabled={agentRunning || huerto.estado.toLowerCase() === 'aprobado'} data-agent-action="create-audit" data-huerto-id={huerto.id}>{agentRunning && !expedientReady ? 'Generando expediente…' : expedientReady ? 'Expediente listo' : 'Generar expediente →'}</button></li><li className={documentResult ? 'is-complete' : agentRunning && expedientReady ? 'is-running' : !expedientReady ? 'is-locked' : ''}><span>2</span><div><b>Generar documento</b><small>Crea el PDF con Vigía a partir del expediente.</small></div><button className="button button-secondary" type="button" onClick={() => { void generatePdfFromSavedExpedient() }} disabled={!expedientReady || agentRunning || huerto.estado.toLowerCase() === 'aprobado'}>{agentRunning && expedientReady ? 'Generando PDF…' : 'Generar PDF con Vigía →'}</button></li><li className={huerto.estado.toLowerCase() === 'aprobado' ? 'is-complete' : !documentResult ? 'is-locked' : ''}><span>3</span><div><b>Dar visto bueno</b><small>Confirma que revisaste el expediente y cierra la auditoría.</small></div><button className="button button-approve" type="button" onClick={() => { void approveAudit() }} disabled={!documentResult || approvingAudit || huerto.estado.toLowerCase() === 'aprobado'}>{huerto.estado.toLowerCase() === 'aprobado' ? 'Auditoría aprobada' : approvingAudit ? 'Aprobando…' : 'Dar visto bueno →'}</button></li></ol><small className="audit-pdf-note">{agentStatus || (expedientReady ? 'El expediente está listo. Continúa con el paso 2.' : 'Completa el paso 1 para habilitar el PDF.')}</small>{agentError && <p className="form-error" role="alert">{agentError}</p>}{documentResult && <button className="text-button" type="button" onClick={() => downloadBase64File(documentResult.contentBase64, documentResult.filename, documentResult.mediaType)}>Descargar {documentResult.mediaType === 'application/pdf' ? 'PDF' : 'Word'} →</button>}</section>
    </>}
  </AppLayout>
}

export default RevisionPage
