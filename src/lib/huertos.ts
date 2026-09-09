import { supabase } from './supabase'
import { throwFriendlyDatabaseError } from './errors'

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
  if (error) throwFriendlyDatabaseError(error, 'No pudimos cargar las huertas. Intenta de nuevo.')
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
  if (error) throwFriendlyDatabaseError(error, 'No pudimos cargar esta huerta. Intenta de nuevo.')
  return data as Huerto
}

export async function createHuerto(input: HuertoInput) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').insert({ ...input, estado: 'activo' }).select().single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos registrar la huerta. Intenta de nuevo.')
  return data as Huerto
}

export async function updateHuerto(id: string, input: HuertoInput) {
  const { data: current, error: currentError } = await supabase
    .from('huertos')
    .select('propietario, nombre, cultivo, municipio, localidad')
    .eq('id', id)
    .single()
  if (currentError) throwFriendlyDatabaseError(currentError, 'No pudimos preparar los cambios de la huerta. Intenta de nuevo.')

  // La geometría puede ajustarse sin invalidar el expediente satelital.
  const hasRelevantChanges = ['propietario', 'nombre', 'cultivo', 'municipio', 'localidad'].some((field) => {
    const previous = String(current[field as keyof typeof current] ?? '').trim()
    const next = String(input[field as keyof Pick<HuertoInput, 'propietario' | 'nombre' | 'cultivo' | 'municipio' | 'localidad'>] ?? '').trim()
    return previous !== next
  })
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').update(input).eq('id', id).select().single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos guardar los cambios de la huerta. Intenta de nuevo.')
  if (hasRelevantChanges) {
    const { error: staleError } = await supabase
      .from('analisis')
      .update({ estado: 'pendiente' })
      .eq('huerto_id', id)
      .eq('estado', 'completado')
    if (staleError) throwFriendlyDatabaseError(staleError, 'La huerta se guardó, pero no pudimos actualizar su evidencia. Intenta guardar de nuevo.')
  }
  return data as Huerto
}

export async function deleteHuerto(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { error } = await supabase.from('huertos').delete().eq('id', id)
  if (error) throwFriendlyDatabaseError(error, 'No pudimos eliminar la huerta. Intenta de nuevo.')
}

export async function solicitarAuditoria(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').update({ estado: 'pendiente' }).eq('id', id).select().single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos enviar la huerta a auditoría. Intenta de nuevo.')
  return data as Huerto
}
