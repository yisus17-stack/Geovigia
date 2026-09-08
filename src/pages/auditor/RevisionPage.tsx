import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import { actualizarEstadoHuerto, getHuertoAuditoria } from '../../lib/auditoria'
import { downloadBase64File, generateAuditWithEve, type EveDocumentResult } from '../../lib/eve'
import type { Huerto } from '../../lib/huertos'

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
    setAgentRunning(true)
    setAgentError('')
    setDocumentResult(null)
    setAgentStatus('Generando auditoría…')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120_000)
    try {
      const document = await generateAuditWithEve(
        { tipo: 'auditoria_huerta', huerta: huerto, estado_revision: estado },
        () => setAgentStatus('Generando auditoría…'),
        controller.signal,
      )
      setDocumentResult(document)
      setAgentStatus(`Auditoría generada. El ${document.mediaType === 'application/pdf' ? 'PDF' : 'Word'} está listo para descargar.`)
    } catch (cause) {
      console.error('[Auditoría] Falló la generación con EVE:', cause)
      const detail = controller.signal.aborted ? 'EVE tardó más de dos minutos sin entregar el documento.' : cause instanceof Error ? cause.message : 'No se pudo generar la auditoría.'
      setAgentError(detail.includes('plantilla Word') ? 'El agente no tiene disponible la plantilla Word necesaria para crear el PDF.' : detail)
      setAgentStatus('')
    } finally {
      window.clearTimeout(timeout)
      setAgentRunning(false)
    }
  }

  return <AppLayout role="auditor">
    {loading && <p className="loading-state">Cargando huerta desde Supabase…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && huerto && <>
      <header className="page-header"><div><p className="eyebrow">Revisión de huerta</p><h1>{huerto.nombre}</h1><p>{huerto.municipio} · {huerto.localidad} · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div></header>
      <TerritoryMap allOrchards orchardId={huerto.id} label={`Mapa de ${huerto.nombre}`} />
      <section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Estado actual</dt><dd>{huerto.estado}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</dd></div></dl></div><form className="review-form" onSubmit={(event) => { void saveStatus(event) }}><p className="eyebrow">Panel de revisión</p><h2>Actualizar estado</h2><label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="requiere revisión">Requiere revisión</option><option value="requiere información">Requiere información</option></select></label><p>Este cambio se guardará en el campo <b>estado</b> de la tabla <b>huertos</b>.</p><button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar estado'}</button>{message && <p className="success-message" role="status">{message}</p>}</form></section>
      <section className="audit-request-panel"><div><p className="eyebrow">Agente de auditoría</p><h2>Generar auditoría</h2><p>El agente prepara el dictamen y su documento descargable para este predio.</p></div><div><button className="button" type="button" onClick={() => { void generateAudit() }} disabled={agentRunning} data-agent-action="create-audit" data-huerto-id={huerto.id}>{agentRunning ? 'Generando auditoría…' : 'Generar auditoría con agente →'}</button><small className="audit-pdf-note">{agentStatus || 'La generación puede tardar hasta dos minutos.'}</small>{agentError && <p className="form-error" role="alert">{agentError}</p>}{documentResult && <button className="text-button" type="button" onClick={() => downloadBase64File(documentResult.contentBase64, documentResult.filename, documentResult.mediaType)}>Descargar {documentResult.mediaType === 'application/pdf' ? 'PDF' : 'Word'} →</button>}</div></section>
    </>}
  </AppLayout>
}

export default RevisionPage
