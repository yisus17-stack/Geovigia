import { supabase } from './supabase'
import type { Huerto } from './huertos'

// La visibilidad depende de las políticas RLS: un auditor ve los huertos que Supabase le autorice.
export async function getHuertosAuditoria() {
  const { data, error } = await supabase.from('huertos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Huerto[]
}

export async function getHuertoAuditoria(id: string) {
  const { data, error } = await supabase.from('huertos').select('*').eq('id', id).single()
  if (error) throw error
  return data as Huerto
}

export async function actualizarEstadoHuerto(id: string, estado: string) {
  const { data, error } = await supabase.from('huertos').update({ estado }).eq('id', id).select().single()
  if (error) throw error
  return data as Huerto
}
