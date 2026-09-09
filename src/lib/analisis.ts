import { supabase } from './supabase'
import { throwFriendlyDatabaseError } from './errors'

export type PersistedImage = {
  anio: number
  fuente?: string
  fecha_escena?: string | null
  nubosidad_porcentaje?: number | null
  thumbnail_url?: string
  tile_url_template?: string
  bounds?: number[]
  ndvi_promedio?: number
  respuesta_imagen?: unknown
}

type AnalysisResponse = {
  expediente?: {
    validacion_cultivo_e_infraestructura?: {
      cultivo_inferido?: string
      indice_textura_espacial?: number
      incongruencia_detectada?: boolean
      observacion?: string
    }
    auditoria_ambiental_y_forestal?: {
      estatus_legal?: string
      dictamen_automatizado?: string
      registros_deforestacion_hansen?: number[]
      alerta_incendios_historicos?: boolean
      deforestacion_en_periodo_analisis?: boolean
    }
  }
}

function yearFromPayload(payload: unknown) {
  const year = Number(payload)
  return Number.isInteger(year) ? year : null
}

export async function saveAgromichAnalysis(input: {
  huertoId: string
  periodStart: number
  periodEnd: number
  response: AnalysisResponse
  rawResponse: unknown
  images: PersistedImage[]
}) {
  const validation = input.response.expediente?.validacion_cultivo_e_infraestructura
  const environmental = input.response.expediente?.auditoria_ambiental_y_forestal

  const { data: analysis, error: analysisError } = await supabase
    .from('analisis')
    .insert({
      huerto_id: input.huertoId,
      periodo_inicio: input.periodStart,
      periodo_fin: input.periodEnd,
      estado: 'completado',
      cultivo_inferido: validation?.cultivo_inferido ?? null,
      indice_textura_espacial: validation?.indice_textura_espacial ?? null,
      incongruencia_detectada: validation?.incongruencia_detectada ?? null,
      estatus_legal: environmental?.estatus_legal ?? null,
      dictamen_automatizado: environmental?.dictamen_automatizado ?? null,
      registros_deforestacion_hansen: environmental?.registros_deforestacion_hansen ?? null,
      alerta_incendios_historicos: environmental?.alerta_incendios_historicos ?? null,
      deforestacion_en_periodo: environmental?.deforestacion_en_periodo_analisis ?? null,
      respuesta_agromich: input.rawResponse,
      completado_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (analysisError) throwFriendlyDatabaseError(analysisError, 'No pudimos guardar el análisis. Intenta generarlo de nuevo.')
  if (!analysis) throw new Error('No pudimos guardar el análisis. Intenta generarlo de nuevo.')

  const { error: expedientError } = await supabase
    .from('expedientes')
    .insert({
      analisis_id: analysis.id,
      estado: 'generado',
      respuesta_completa: input.rawResponse,
      generado_at: new Date().toISOString(),
    })

  if (expedientError) throwFriendlyDatabaseError(expedientError, 'El análisis se guardó, pero no pudimos preparar el expediente.')

  await saveAnalysisImages(analysis.id as string, input.images)

  return analysis.id as string
}

export async function saveAnalysisImages(analysisId: string, images: PersistedImage[]) {
  const imageRows = images
    .map((image) => ({
      analisis_id: analysisId,
      anio: yearFromPayload(image.anio),
      fuente: image.fuente ?? 'Desconocida',
      fecha_escena: image.fecha_escena ?? null,
      nubosidad_porcentaje: image.nubosidad_porcentaje ?? null,
      thumbnail_url: image.thumbnail_url ?? null,
      tile_url_template: image.tile_url_template ?? null,
      bounds: image.bounds ?? null,
      ndvi_promedio: image.ndvi_promedio ?? null,
      respuesta_imagen: image.respuesta_imagen ?? image,
    }))
    .filter((image): image is typeof image & { anio: number } => image.anio !== null)

  if (imageRows.length > 0) {
    const { error: imagesError } = await supabase.from('imagenes_analisis').insert(imageRows)
    if (imagesError) throwFriendlyDatabaseError(imagesError, 'No pudimos guardar las imágenes del análisis.')
  }

}

export type AnalysisSummary = {
  cultivo_inferido: string | null
  incongruencia_detectada: boolean | null
  estatus_legal: string | null
  dictamen_automatizado: string | null
  registros_deforestacion_hansen: number[] | null
  alerta_incendios_historicos: boolean | null
  deforestacion_en_periodo: boolean | null
}

export async function getLatestAgromichAnalysis(huertoId: string): Promise<{ response: unknown; images: PersistedImage[]; summary: AnalysisSummary } | null> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analisis')
    .select('id, respuesta_agromich, cultivo_inferido, incongruencia_detectada, estatus_legal, dictamen_automatizado, registros_deforestacion_hansen, alerta_incendios_historicos, deforestacion_en_periodo')
    .eq('huerto_id', huertoId)
    .order('completado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (analysisError) throwFriendlyDatabaseError(analysisError, 'No pudimos consultar el análisis de esta huerta.')
  if (!analysis) return null

  const { data: images, error: imagesError } = await supabase
    .from('imagenes_analisis')
    .select('anio, fuente, fecha_escena, nubosidad_porcentaje, thumbnail_url, tile_url_template, bounds, ndvi_promedio, respuesta_imagen')
    .eq('analisis_id', analysis.id)
    .order('anio', { ascending: true })

  if (imagesError) throwFriendlyDatabaseError(imagesError, 'No pudimos cargar las imágenes del análisis.')
  return {
    response: analysis.respuesta_agromich,
    images: (images ?? []) as PersistedImage[],
    summary: {
      cultivo_inferido: analysis.cultivo_inferido,
      incongruencia_detectada: analysis.incongruencia_detectada,
      estatus_legal: analysis.estatus_legal,
      dictamen_automatizado: analysis.dictamen_automatizado,
      registros_deforestacion_hansen: analysis.registros_deforestacion_hansen,
      alerta_incendios_historicos: analysis.alerta_incendios_historicos,
      deforestacion_en_periodo: analysis.deforestacion_en_periodo,
    },
  }
}

export async function getExpedientResponse(analysisId: string) {
  const { data, error } = await supabase
    .from('expedientes')
    .select('respuesta_completa')
    .eq('analisis_id', analysisId)
    .single()
  if (error) throwFriendlyDatabaseError(error, 'No pudimos cargar el expediente.')
  return data.respuesta_completa
}

export async function getLatestSavedExpedient(huertoId: string): Promise<{ analysisId: string; requiresRefresh: boolean } | null> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analisis')
    .select('id, estado')
    .eq('huerto_id', huertoId)
    .order('completado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (analysisError) throwFriendlyDatabaseError(analysisError, 'No pudimos consultar el expediente de esta huerta.')
  if (!analysis) return null

  const { data: expedient, error: expedientError } = await supabase
    .from('expedientes')
    .select('analisis_id')
    .eq('analisis_id', analysis.id)
    .maybeSingle()

  if (expedientError) throwFriendlyDatabaseError(expedientError, 'El análisis se guardó, pero no pudimos preparar el expediente.')
  if (!expedient) return null
  return { analysisId: analysis.id, requiresRefresh: analysis.estado !== 'completado' }
}
