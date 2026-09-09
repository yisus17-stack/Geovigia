import { supabase } from './supabase'

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

  if (analysisError || !analysis) throw analysisError ?? new Error('AgroMich no devolvió un análisis guardable.')

  const { error: expedientError } = await supabase
    .from('expedientes')
    .insert({
      analisis_id: analysis.id,
      estado: 'generado',
      respuesta_completa: input.rawResponse,
      generado_at: new Date().toISOString(),
    })

  if (expedientError) throw expedientError

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
    if (imagesError) throw imagesError
  }

}

export async function getExpedientResponse(analysisId: string) {
  const { data, error } = await supabase
    .from('expedientes')
    .select('respuesta_completa')
    .eq('analisis_id', analysisId)
    .single()
  if (error) throw error
  return data.respuesta_completa
}
