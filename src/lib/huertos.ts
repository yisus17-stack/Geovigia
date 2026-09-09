import { supabase } from './supabase'

function throwDatabaseError(error: { message?: string; details?: string; hint?: string; code?: string }): never {
  const parts = [error.message, error.details, error.hint].filter((part): part is string => Boolean(part && part.trim()))
  const description = parts.join(' ')
  console.error('[GeoVigía] Error de Supabase', { code: error.code, message: error.message, details: error.details, hint: error.hint })
  throw new Error(error.code ? `[${error.code}] ${description}` : description || 'Supabase rechazó la operación.')
}

export type PolygonGeometry = { type: 'Polygon'; coordinates: number[][][] }

export type Huerto = {
  id: string
  propietario: string
  nombre: string
  cultivo: string
  municipio: string
  localidad: string
  poligono: PolygonGeometry | null
  superficie_ha: number | null
  estado: string
  created_at: string
}

export type HuertoInput = Pick<Huerto, 'propietario' | 'nombre' | 'cultivo' | 'municipio' | 'localidad' | 'poligono' | 'superficie_ha'>

export async function getHuertos() {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').select('*').order('created_at', { ascending: false })
  if (error) throwDatabaseError(error)
  return (data ?? []) as Huerto[]
}

export function formatHuertoDate(huerto: Huerto) {
  const parsed = new Date(huerto.created_at)
  return Number.isNaN(parsed.valueOf()) ? 'Registro activo' : parsed.toLocaleDateString('es-MX')
}

export async function getHuerto(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').select('*').eq('id', id).single()
  if (error) throwDatabaseError(error)
  return data as Huerto
}

export async function createHuerto(input: HuertoInput) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').insert({ ...input, estado: 'activo' }).select().single()
  if (error) throwDatabaseError(error)
  return data as Huerto
}

export async function updateHuerto(id: string, input: HuertoInput) {
  const { data: current, error: currentError } = await supabase
    .from('huertos')
    .select('propietario, nombre, cultivo, municipio, localidad')
    .eq('id', id)
    .single()
  if (currentError) throwDatabaseError(currentError)

  // La geometría puede ajustarse sin invalidar el expediente satelital.
  const hasRelevantChanges = ['propietario', 'nombre', 'cultivo', 'municipio', 'localidad'].some((field) => {
    const previous = String(current[field as keyof typeof current] ?? '').trim()
    const next = String(input[field as keyof Pick<HuertoInput, 'propietario' | 'nombre' | 'cultivo' | 'municipio' | 'localidad'>] ?? '').trim()
    return previous !== next
  })
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').update(input).eq('id', id).select().single()
  if (error) throwDatabaseError(error)
  if (hasRelevantChanges) {
    const { error: staleError } = await supabase
      .from('analisis')
      .update({ estado: 'requiere_actualizacion' })
      .eq('huerto_id', id)
      .eq('estado', 'completado')
    if (staleError) throwDatabaseError(staleError)
  }
  return data as Huerto
}

export async function deleteHuerto(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { error } = await supabase.from('huertos').delete().eq('id', id)
  if (error) throwDatabaseError(error)
}

export async function solicitarAuditoria(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').update({ estado: 'pendiente' }).eq('id', id).select().single()
  if (error) throwDatabaseError(error)
  return data as Huerto
}
