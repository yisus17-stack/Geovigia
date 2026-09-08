export type EveDocumentResult = { contentBase64: string; filename: string; mediaType: string }
export type EveAuditResult = {
  audit_id: string
  resultado: string
  nivel_riesgo: string
  confianza: number
  resumen: string
  requiere_auditor: boolean
  [key: string]: unknown
}
export type EveGenerationResult = { document: EveDocumentResult; evaluation?: EveAuditResult }
export type EvePdfResult = EveDocumentResult

type EveEvent = Record<string, unknown>

function errorFromEvent(event: EveEvent) {
  const data = event.data as EveEvent | undefined
  const status = event.status ?? data?.status
  if (status !== 'error') return null
  const message = event.mensaje ?? event.message ?? data?.mensaje ?? data?.message
  return typeof message === 'string' ? message : 'El agente no pudo generar la auditoría.'
}

function messageFromEvent(event: EveEvent) {
  const data = event.data as EveEvent | undefined
  return [event.message, event.statusMessage, data?.message, data?.status].find((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

const resultPaths = [
  (event: EveEvent) => event.data,
  (event: EveEvent) => (event.data as EveEvent | undefined)?.output,
  (event: EveEvent) => (event.data as EveEvent | undefined)?.result,
  (event: EveEvent) => ((event.data as EveEvent | undefined)?.output as EveEvent | undefined)?.content,
  (event: EveEvent) => ((event.data as EveEvent | undefined)?.result as EveEvent | undefined)?.content,
]

function flatten(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (value && typeof value === 'object') return [value, ...Object.values(value).flatMap(flatten)]
  return []
}

function looksLikeDocument(contentBase64: string, mediaType: string) {
  const encoded = contentBase64.includes(',') ? contentBase64.split(',').pop() ?? '' : contentBase64
  if (mediaType === 'application/pdf') return encoded.startsWith('JVBERi0')
  return mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && encoded.startsWith('UEsDB')
}

export function extractDocumentResult(event: EveEvent): EveDocumentResult | null {
  const candidates = resultPaths.flatMap((getValue) => flatten(getValue(event)))
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const file = candidate as Record<string, unknown>
    const contentBase64 = file.contentBase64 ?? file.data
    if (typeof contentBase64 !== 'string' || typeof file.filename !== 'string' || typeof file.mediaType !== 'string') continue
    if (!looksLikeDocument(contentBase64, file.mediaType)) continue
    const extension = file.mediaType === 'application/pdf' ? '.pdf' : '.docx'
    const filename = file.filename.toLowerCase().endsWith(extension) ? file.filename : `${file.filename}${extension}`
    return { contentBase64, filename, mediaType: file.mediaType }
  }
  return null
}

function extractEvaluation(event: EveEvent): EveAuditResult | undefined {
  const candidates = resultPaths.flatMap((getValue) => flatten(getValue(event)))
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const value = candidate as Record<string, unknown>
    if (typeof value.audit_id !== 'string' || typeof value.resultado !== 'string') continue
    if (typeof value.nivel_riesgo !== 'string' || typeof value.confianza !== 'number') continue
    return value as EveAuditResult
  }
  return undefined
}

export const extractPdfResult = extractDocumentResult

export function downloadBase64File(contentBase64: string, filename: string, mediaType = 'application/pdf') {
  const encoded = contentBase64.includes(',') ? contentBase64.split(',').pop() ?? '' : contentBase64
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mediaType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function generateAuditWithEve(expedient: unknown, onStatus: (message: string) => void, signal?: AbortSignal): Promise<EveGenerationResult> {
  const eveUrl = import.meta.env.VITE_EVE_URL
  if (!eveUrl) throw new Error('Falta configurar VITE_EVE_URL.')
  const message = `Genera la auditoría y el informe PDF usando este expediente maestro. Usa la tool generar_resolucion_pdf y devuelve el archivo PDF.\n\nExpediente:\n${JSON.stringify(expedient, null, 2)}`
  onStatus('Enviando expediente al agente…')
  const sessionResponse = await fetch(`${eveUrl.replace(/\/$/, '')}/eve/v1/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }), signal })
  if (!sessionResponse.ok) throw new Error(`EVE rechazó la solicitud (HTTP ${sessionResponse.status}).`)
  const session = await sessionResponse.json() as { ok?: boolean; sessionId?: string }
  if (!session.ok || !session.sessionId) throw new Error('EVE no devolvió una sesión válida.')
  onStatus('El agente está generando la auditoría…')
  const streamResponse = await fetch(`${eveUrl.replace(/\/$/, '')}/eve/v1/session/${encodeURIComponent(session.sessionId)}/stream`, { signal })
  if (!streamResponse.ok || !streamResponse.body) throw new Error(`No se pudo leer el resultado de EVE (HTTP ${streamResponse.status}).`)
  const reader = streamResponse.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let evaluation: EveAuditResult | undefined
  const processEvent = (line: string) => {
    const payload = line.startsWith('data:') ? line.slice(5).trim() : line
    let event: EveEvent
    try { event = JSON.parse(payload) as EveEvent } catch { event = { message: payload } }
    const error = errorFromEvent(event)
    if (error) throw new Error(error)
    const status = messageFromEvent(event)
    if (status) onStatus(status)
    evaluation = extractEvaluation(event) ?? evaluation
    return extractDocumentResult(event)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue
        const document = processEvent(line)
        if (document) { await reader.cancel(); return { document, evaluation } }
      }
      if (done) break
    }
    if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
      const document = processEvent(buffer)
      if (document) return { document, evaluation }
    }
  } finally { reader.releaseLock() }
  throw new Error('El agente terminó sin entregar el PDF de auditoría.')
}
