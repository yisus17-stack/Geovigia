import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import { getHuerto, type Huerto } from '../../lib/huertos'
import { supabase } from '../../lib/supabase'
import { closeLoading, showError, showLoading, showSuccess } from '../../lib/alerts'
import { getLatestAgromichAnalysis, saveAgromichAnalysis, type AnalysisSummary, type PersistedImage } from '../../lib/analisis'

type NdviPoint = { anio: number; ndvi_promedio: number }
type ApiImage = { anio: number; thumbnail_url?: string; image_url?: string; url?: string; fuente?: string; fecha_escena?: string | null; nubosidad_porcentaje?: number | null; tile_url_template?: string; bounds?: number[]; ndvi_promedio?: number }
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)
type ApiResult = {
  expediente?: {
    validacion_cultivo_e_infraestructura?: { cultivo_inferido?: string; observacion?: string; incongruencia_detectada?: boolean }
    auditoria_ambiental_y_forestal?: { estatus_legal?: string; dictamen_automatizado?: string; registros_deforestacion_hansen?: number[] }
    series_historicas?: { evolucion_ndvi_anual?: NdviPoint[] }
  }
  imagenes?: ApiImage[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function findValue(value: unknown, keys: string[]): unknown {
  const record = asRecord(value)
  if (!record) return undefined
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key]
  for (const child of Object.values(record)) {
    const found = findValue(child, keys)
    if (found !== undefined) return found
  }
  return undefined
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function normalizeSavedResult(response: unknown, summary: AnalysisSummary, images: ApiImage[]): ApiResult {
  const payload = asRecord(response) ?? {}
  const nestedPayload = asRecord(payload.data) ?? asRecord(payload.resultado) ?? asRecord(payload.result) ?? payload
  const expediente = asRecord(nestedPayload.expediente) ?? nestedPayload
  const validation = asRecord(expediente.validacion_cultivo_e_infraestructura) ?? expediente
  const audit = asRecord(expediente.auditoria_ambiental_y_forestal) ?? expediente
  const series = asRecord(expediente.series_historicas) ?? expediente
  const ndviPoints = findValue(series, ['evolucion_ndvi_anual', 'serie_ndvi', 'ndvi_anual'])
  const hansen = findValue(audit, ['registros_deforestacion_hansen', 'anios_deforestacion_hansen'])

  return {
    expediente: {
      validacion_cultivo_e_infraestructura: {
        cultivo_inferido: stringValue(findValue(validation, ['cultivo_inferido', 'cultivo_detectado'])) ?? summary.cultivo_inferido ?? undefined,
        observacion: stringValue(findValue(validation, ['observacion', 'observaciones', 'detalle'])),
        incongruencia_detectada: booleanValue(findValue(validation, ['incongruencia_detectada', 'incongruencia'])) ?? summary.incongruencia_detectada ?? undefined,
      },
      auditoria_ambiental_y_forestal: {
        estatus_legal: stringValue(findValue(audit, ['estatus_legal', 'dictamen_legal', 'estatus'])) ?? summary.estatus_legal ?? undefined,
        dictamen_automatizado: stringValue(findValue(audit, ['dictamen_automatizado', 'dictamen', 'recomendacion'])) ?? summary.dictamen_automatizado ?? undefined,
        registros_deforestacion_hansen: (Array.isArray(hansen) ? hansen : summary.registros_deforestacion_hansen ?? undefined) as number[] | undefined,
      },
      series_historicas: Array.isArray(ndviPoints) ? { evolucion_ndvi_anual: ndviPoints as NdviPoint[] } : undefined,
    },
    imagenes: images,
  }
}

const ndviChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650 },
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#073d2d',
      cornerRadius: 8,
      displayColors: false,
      padding: 10,
      callbacks: { label: (context) => `NDVI: ${Number(context.parsed.y).toFixed(3)}` },
    },
  },
  scales: {
    x: { border: { display: false }, grid: { display: false }, ticks: { color: '#66706b', font: { size: 11, weight: 600 } } },
    y: { min: 0, max: 1, border: { display: false }, grid: { color: 'rgba(32, 59, 49, .10)' }, ticks: { color: '#66706b', font: { size: 11 }, stepSize: .2, callback: (value) => Number(value).toFixed(1) } },
  },
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
    return [{ anio, thumbnail_url: fullImageUrl ?? (typeof row.thumbnail_url === 'string' ? row.thumbnail_url : undefined), image_url: fullImageUrl, url: typeof row.url === 'string' ? row.url : undefined, fuente: typeof row.fuente === 'string' ? row.fuente : undefined, fecha_escena: typeof row.fecha_escena === 'string' ? row.fecha_escena : null, nubosidad_porcentaje: typeof row.nubosidad_porcentaje === 'number' ? row.nubosidad_porcentaje : null, tile_url_template: typeof row.tile_url_template === 'string' ? row.tile_url_template : undefined, bounds: Array.isArray(row.bounds) && row.bounds.every((value) => typeof value === 'number') ? row.bounds as number[] : undefined, ndvi_promedio: typeof row.ndvi_promedio === 'number' ? row.ndvi_promedio : undefined }]
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
    void Promise.all([getHuerto(huertoId), getLatestAgromichAnalysis(huertoId)]).then(([row, savedAnalysis]) => {
      if (!active) return
      setHuerto(row)
      if (savedAnalysis) {
        const savedImages = savedAnalysis.images.map((image) => ({ ...image, image_url: image.thumbnail_url, url: image.thumbnail_url }))
        setResult(normalizeSavedResult(savedAnalysis.response, savedAnalysis.summary, savedImages))
      }
    }).catch(() => { if (active) setError('No pudimos cargar la huerta para analizar.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [huertoId])

  const images = useMemo(() => [...(result?.imagenes ?? [])].sort((first, second) => first.anio - second.anio), [result])
  const ndvi = useMemo(() => {
    const series = result?.expediente?.series_historicas?.evolucion_ndvi_anual ?? []
    if (series.length > 0) return series
    return images.flatMap((image) => typeof image.ndvi_promedio === 'number' ? [{ anio: image.anio, ndvi_promedio: image.ndvi_promedio }] : [])
  }, [images, result])
  const ndviChartData = useMemo(() => ({
    labels: ndvi.map((point) => String(point.anio)),
    datasets: [{
      data: ndvi.map((point) => point.ndvi_promedio),
      borderColor: '#0b5e43',
      backgroundColor: 'rgba(11, 94, 67, .12)',
      borderWidth: 2.5,
      fill: true,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#0b5e43',
      pointBorderWidth: 2.5,
      pointHoverBackgroundColor: '#0b5e43',
      pointHoverRadius: 5,
      pointRadius: 3.5,
      tension: .32,
    }],
  }), [ndvi])

  async function runAnalysis() {
    if (!huerto?.poligono) { setError('Esta huerta necesita un polígono antes de generar el expediente.'); void showError('Falta el polígono', 'Delimita la huerta antes de generar el expediente.'); return }
    if (!apiBase) { setError('Configura VITE_AGROMICH_API_URL para producción.'); void showError('API no configurada', 'Falta configurar la conexión con AgroMich.'); return }
    setRunning(true)
    setError('')
    showLoading('Generando expediente...', 'Consultamos el análisis ambiental y las imágenes históricas.')
    try {
      const { data } = await supabase.auth.getUser()
      const responsableRegistro = huerto.propietario || String(data.user?.user_metadata?.full_name ?? data.user?.email ?? 'Responsable del registro')
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: currentYear - 2018 + 1 }, (_, index) => 2018 + index)
      const [analysisResponse, imagesResponse] = await Promise.all([
        fetch(`${apiBase}/api/v1/expediente/generar-completo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre_huerto: huerto.nombre, productor: responsableRegistro, municipio: huerto.municipio, cultivo: huerto.cultivo, geometry: huerto.poligono, anio_inicio: 2018, anio_fin: new Date().getFullYear() }) }),
        fetch(`${apiBase}/api/v1/expediente/imagenes-historicas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geometry: huerto.poligono, anios: years, cultivo: huerto.cultivo, visualizacion: 'rgb', mes_inicio: 1, mes_fin: 4 }) }),
      ])
      if (!analysisResponse.ok) throw new Error('AgroMich no pudo generar el expediente.')
      if (!imagesResponse.ok) throw new Error('AgroMich no pudo generar las imágenes históricas.')
      const analysis = await analysisResponse.json() as ApiResult
      const parsedImages = parseImages(await imagesResponse.json() as unknown)
      await saveAgromichAnalysis({
        huertoId,
        periodStart: 2018,
        periodEnd: new Date().getFullYear(),
        response: analysis,
        rawResponse: analysis,
        images: parsedImages.map((image): PersistedImage => ({
          anio: image.anio,
          fuente: image.fuente,
          fecha_escena: image.fecha_escena,
          nubosidad_porcentaje: image.nubosidad_porcentaje,
          thumbnail_url: image.thumbnail_url,
          tile_url_template: image.tile_url_template,
          bounds: image.bounds,
          ndvi_promedio: image.ndvi_promedio,
          respuesta_imagen: image,
        })),
      })
      setResult(normalizeSavedResult(analysis, {
        cultivo_inferido: null,
        incongruencia_detectada: null,
        estatus_legal: null,
        dictamen_automatizado: null,
        registros_deforestacion_hansen: null,
      }, parsedImages))
      closeLoading()
      await showSuccess('Expediente generado', 'La evidencia histórica está lista para revisar.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo ejecutar el análisis.'
      closeLoading(); setError(message); void showError('No se pudo generar el expediente', message)
    } finally { setRunning(false) }
  }

  const validation = result?.expediente?.validacion_cultivo_e_infraestructura
  const audit = result?.expediente?.auditoria_ambiental_y_forestal

  return <section className="agromich-panel"><div><p className="eyebrow">Evidencia histórica</p><h2>Expediente satelital</h2><p>Genera el dictamen e imágenes Sentinel/Landsat de esta huerta.</p></div>{loading ? <p>Cargando datos del predio...</p> : <button className="button" onClick={() => { void runAnalysis() }} disabled={running || !huerto?.poligono}>{running ? 'Generando evidencia histórica...' : 'Generar expediente e imágenes →'}</button>}{error && <p className="form-error" role="alert">{error}</p>}{result && <div className="agromich-result">{validation?.incongruencia_detectada === false && <aside className="analysis-congruence-alert" role="alert"><span aria-hidden="true">!</span><div><b>Validación de cultivo pendiente</b><p>AgroMich no confirmó la congruencia entre el cultivo declarado y la evidencia espacial. Revisa el predio antes de continuar con la auditoría.</p></div></aside>}<div className="analysis-summary"><div><span>Dictamen</span><b>{audit?.estatus_legal ?? 'Sin dictamen'}</b><p>{audit?.dictamen_automatizado}</p></div><div><span>Cultivo inferido</span><b>{validation?.cultivo_inferido ?? 'Sin dato'}</b><p>{validation?.observacion}</p></div><div><span>Congruencia</span><b>{validation?.incongruencia_detectada === false ? 'Por verificar' : 'Sin alertas'}</b><p>{validation?.incongruencia_detectada === false ? 'La validación requiere revisión humana.' : 'La validación automática no reportó alertas.'}</p></div></div>{images.length > 0 && <div className="satellite-timeline"><p className="eyebrow">Imágenes históricas</p><div>{images.map((image) => { const url = image.thumbnail_url ?? image.image_url ?? image.url; return <figure key={image.anio}>{url ? <img src={url} alt={`Imagen satelital ${image.anio}`} /> : <span>Imagen no disponible</span>}<figcaption>{image.anio} · {image.fuente ?? 'Satelital'}</figcaption></figure> })}</div></div>}{ndvi.length > 0 && <div className="ndvi-timeline"><div><p className="eyebrow">Serie histórica NDVI</p><h3>Evolución de la vegetación</h3><p>Índice anual de vegetación obtenido del expediente de AgroMich.</p></div><div className="ndvi-line-chart"><Line aria-label="Gráfica de línea de evolución NDVI" data={ndviChartData} options={ndviChartOptions} /></div></div>}{audit?.registros_deforestacion_hansen?.length ? <p className="analysis-alert">Años con registros Hansen: {audit.registros_deforestacion_hansen.join(', ')}</p> : null}</div>}</section>
}

export default AgromichAnalysisPanel
