import { supabase } from './supabase'

export type PolygonGeometry = { type: 'Polygon'; coordinates: number[][][] }

export type Huerto = {
  id: string
  propietario_id: string
  nombre: string
  cultivo: string
  municipio: string
  localidad: string
  poligono: PolygonGeometry | null
  superficie_ha: number | null
  estado: string
  created_at: string
}

export type HuertoInput = Pick<Huerto, 'nombre' | 'cultivo' | 'municipio' | 'localidad' | 'poligono' | 'superficie_ha'>

export async function getHuertos() {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesion no esta activa.')
  const { data, error } = await supabase.from('huertos').select('*').eq('propietario_id', auth.user.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Huerto[]
}

export async function getHuerto(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesion no esta activa.')
  const { data, error } = await supabase.from('huertos').select('*').eq('id', id).eq('propietario_id', auth.user.id).single()
  if (error) throw error
  return data as Huerto
}

export async function createHuerto(input: HuertoInput) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesion no esta activa.')
  const { data, error } = await supabase.from('huertos').insert({ ...input, propietario_id: auth.user.id, estado: 'activo' }).select().single()
  if (error) throw error
  return data as Huerto
}

export async function updateHuerto(id: string, input: HuertoInput) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesion no esta activa.')
  const { data, error } = await supabase.from('huertos').update(input).eq('id', id).eq('propietario_id', auth.user.id).select().single()
  if (error) throw error
  return data as Huerto
}

export async function deleteHuerto(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { error } = await supabase.from('huertos').delete().eq('id', id).eq('propietario_id', auth.user.id)
  if (error) throw error
}

export async function solicitarAuditoria(id: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Tu sesión no está activa.')
  const { data, error } = await supabase.from('huertos').update({ estado: 'pendiente' }).eq('id', id).eq('propietario_id', auth.user.id).select().single()
  if (error) throw error
  return data as Huerto
}
