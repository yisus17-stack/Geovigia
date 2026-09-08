import { useEffect, useMemo, useState } from 'react'
import { getHuerto, type Huerto } from '../../lib/huertos'
import { supabase } from '../../lib/supabase'
import { closeLoading, showError, showLoading, showSuccess } from '../../lib/alerts'

type NdviPoint = { anio: number; ndvi_promedio: number }
type ApiImage = { anio: number; thumbnail_url?: string; image_url?: string; url?: string; fuente?: string }
type ApiResult = {
  expediente?: {
    validacion_cultivo_e_infraestructura?: { cultivo_inferido?: string; observacion?: string }
    auditoria_ambiental_y_forestal?: { estatus_legal?: string; dictamen_automatizado?: string; registros_deforestacion_hansen?: number[] }
    series_historicas?: { evolucion_ndvi_anual?: NdviPoint[] }
  }
  imagenes?: ApiImage[]
}

const apiBase = import.meta.env.DEV ? '/agromich-api' : import.meta.env.VITE_AGROMICH_API_URL

function parseImages(payload: unknown): ApiImage[] {
  if (!payload || typeof payload !== 'object') return []
  const data = payload as { imagenes?: unknown; resultados?: unknown; series?: unknown }
  const list = data.imagenes ?? data.resultados ?? data.series
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const anio = Number(row.anio ?? row.year)
    if (!Number.isFinite(anio)) return []
    const fullImageUrl = typeof row.image_url === 'string' ? row.image_url : typeof row.url === 'string' ? row.url : undefined
    return [{ anio, thumbnail_url: fullImageUrl ?? (typeof row.thumbnail_url === 'string' ? row.thumbnail_url : undefined), image_url: fullImageUrl, url: typeof row.url === 'string' ? row.url : undefined, fuente: typeof row.fuente === 'string' ? row.fuente : undefined }]
  })
}

function AgromichAnalysisPanel({ huertoId }: { huertoId: string }) {
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuerto(huertoId).then((row) => { if (active) setHuerto(row) }).catch(() => { if (active) setError('No pudimos cargar la huerta para analizar.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [huertoId])

  const ndvi = useMemo(() => result?.expediente?.series_historicas?.evolucion_ndvi_anual ?? [], [result])
  const images = result?.imagenes ?? []
  const maxNdvi = useMemo(() => Math.max(...ndvi.map((point) => point.ndvi_promedio), .01), [ndvi])

  async function runAnalysis() {
    if (!huerto?.poligono) { setError('Esta huerta necesita un polígono antes de generar el expediente.'); void showError('Falta el polígono', 'Delimita la huerta antes de generar el expediente.'); return }
    if (!apiBase) { setError('Configura VITE_AGROMICH_API_URL para producción.'); void showError('API no configurada', 'Falta configurar la conexión con AgroMich.'); return }
    setRunning(true)
    setError('')
    showLoading('Generando expediente...', 'Consultamos el análisis ambiental y las imágenes históricas.')
    try {
      const { data } = await supabase.auth.getUser()
      const responsable = String(data.user?.user_metadata?.full_name ?? data.user?.email ?? 'Responsable del registro')
      const years = [2018, 2020, 2022, 2024, new Date().getFullYear()]
      const [analysisResponse, imagesResponse] = await Promise.all([
        fetch(`${apiBase}/api/v1/expediente/generar-completo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre_huerto: huerto.nombre, productor: responsable, municipio: huerto.municipio, cultivo: huerto.cultivo, geometry: huerto.poligono, anio_inicio: 2018, anio_fin: new Date().getFullYear() }) }),
        fetch(`${apiBase}/api/v1/expediente/imagenes-historicas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geometry: huerto.poligono, anios: years, cultivo: huerto.cultivo, visualizacion: 'rgb', mes_inicio: 1, mes_fin: 4 }) }),
      ])
      if (!analysisResponse.ok) throw new Error('AgroMich no pudo generar el expediente.')
      if (!imagesResponse.ok) throw new Error('AgroMich no pudo generar las imágenes históricas.')
      const analysis = await analysisResponse.json() as ApiResult
      setResult({ ...analysis, imagenes: parseImages(await imagesResponse.json() as unknown) })
      closeLoading()
      await showSuccess('Expediente generado', 'La evidencia histórica está lista para revisar.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo ejecutar el análisis.'
      closeLoading(); setError(message); void showError('No se pudo generar el expediente', message)
    } finally { setRunning(false) }
  }

  const validation = result?.expediente?.validacion_cultivo_e_infraestructura
  const audit = result?.expediente?.auditoria_ambiental_y_forestal

  return <section className="agromich-panel"><div><p className="eyebrow">Evidencia histórica</p><h2>Expediente satelital</h2><p>Genera el dictamen e imágenes Sentinel/Landsat de esta huerta.</p></div>{loading ? <p>Cargando datos del predio...</p> : <button className="button" onClick={() => { void runAnalysis() }} disabled={running || !huerto?.poligono}>{running ? 'Generando evidencia histórica...' : 'Generar expediente e imágenes →'}</button>}{error && <p className="form-error" role="alert">{error}</p>}{result && <div className="agromich-result"><div className="analysis-summary"><div><span>Dictamen</span><b>{audit?.estatus_legal ?? 'Sin dictamen'}</b><p>{audit?.dictamen_automatizado}</p></div><div><span>Cultivo inferido</span><b>{validation?.cultivo_inferido ?? 'Sin dato'}</b><p>{validation?.observacion}</p></div></div>{images.length > 0 && <div className="satellite-timeline"><p className="eyebrow">Imágenes históricas</p><div>{images.map((image) => { const url = image.thumbnail_url ?? image.image_url ?? image.url; return <figure key={image.anio}>{url ? <img src={url} alt={`Imagen satelital ${image.anio}`} /> : <span>Imagen no disponible</span>}<figcaption>{image.anio} · {image.fuente ?? 'Satelital'}</figcaption></figure> })}</div></div>}{ndvi.length > 0 && <div className="ndvi-timeline"><div><p className="eyebrow">Línea de tiempo NDVI</p><h3>Evolución de la vegetación</h3></div><div className="ndvi-bars">{ndvi.map((point) => <div key={point.anio} title={`${point.anio}: ${point.ndvi_promedio.toFixed(3)}`}><i style={{ height: `${Math.max(10, point.ndvi_promedio / maxNdvi * 100)}%` }} /><span>{point.anio}</span></div>)}</div></div>}{audit?.registros_deforestacion_hansen?.length ? <p className="analysis-alert">Años con registros Hansen: {audit.registros_deforestacion_hansen.join(', ')}</p> : null}</div>}</section>
}

export default AgromichAnalysisPanel
