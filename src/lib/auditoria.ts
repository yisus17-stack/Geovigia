import { supabase } from './supabase'
import type { Huerto } from './huertos'
import { throwFriendlyDatabaseError } from './errors'

// La visibilidad depende de las políticas RLS: un auditor ve los huertos que Supabase le autorice.
export async function getHuertosAuditoria() {
  const { data, error } = await supabase.from('huertos').select('*')
  if (error) throwFriendlyDatabaseError(error, 'No pudimos cargar las huertas para auditoría. Intenta de nuevo.')
  return (data ?? []) as Huerto[]
}

export async function getHuertoAuditoria(id: string) {
  const { data, error } = await supabase.from('huertos').select('*').eq('id', id).single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos cargar esta huerta para auditoría. Intenta de nuevo.')
  return data as Huerto
}

export async function actualizarEstadoHuerto(id: string, estado: string) {
  const { data, error } = await supabase.from('huertos').update({ estado }).eq('id', id).select().single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos actualizar el estado de la huerta. Intenta de nuevo.')
  return data as Huerto
}
