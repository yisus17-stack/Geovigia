import { supabase } from './supabase'
import type { EveAuditResult, EveDocumentResult } from './eve'

export type Auditoria = {
  id: string
  audit_id: string
  huerto_id: string
  propietario_id: string
  resultado: string
  nivel_riesgo: string
  confianza: number | null
  resumen: string
  requiere_auditor: boolean
  evaluacion: EveAuditResult
  expediente: Record<string, unknown> | null
  documento_path: string | null
  documento_url: string | null
  created_at: string
  huerto?: { nombre: string; municipio: string; cultivo: string } | null
}

function base64ToBytes(value: string) {
  const encoded = value.includes(',') ? value.split(',').pop() ?? '' : value
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
}

export async function guardarAuditoria({ huertoId, propietarioId, expediente, evaluation, document }: {
  huertoId: string
  propietarioId: string
  expediente: Record<string, unknown>
  evaluation: EveAuditResult
  document: EveDocumentResult
}) {
  const path = `${huertoId}/${evaluation.audit_id}-${document.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error: uploadError } = await supabase.storage.from('auditorias').upload(path, base64ToBytes(document.contentBase64), {
    contentType: document.mediaType,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.from('auditorias').insert({
    audit_id: evaluation.audit_id,
    huerto_id: huertoId,
    propietario_id: propietarioId,
    resultado: evaluation.resultado,
    nivel_riesgo: evaluation.nivel_riesgo,
    confianza: evaluation.confianza,
    resumen: evaluation.resumen,
    requiere_auditor: evaluation.requiere_auditor,
    evaluacion: evaluation,
    expediente,
    documento_path: path,
  }).select().single()
  if (error) {
    await supabase.storage.from('auditorias').remove([path])
    throw error
  }

  const { data: signed, error: signedError } = await supabase.storage.from('auditorias').createSignedUrl(path, 60 * 60 * 24 * 7)
  if (!signedError && signed?.signedUrl) {
    await supabase.from('auditorias').update({ documento_url: signed.signedUrl }).eq('id', data.id)
  }
  return data as Auditoria
}

export async function getAuditorias() {
  const { data, error } = await supabase.from('auditorias').select('*, huerto:huertos(nombre, municipio, cultivo)').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Auditoria[]
}

export async function getAuditoria(id: string) {
  const { data, error } = await supabase.from('auditorias').select('*, huerto:huertos(nombre, municipio, cultivo)').eq('id', id).single()
  if (error) throw error
  return data as Auditoria
}
