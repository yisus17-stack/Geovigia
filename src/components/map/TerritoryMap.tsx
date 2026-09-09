import landingImage from '../../assets/landing.png'
import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, ImageOverlay, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { supabase } from '../../lib/supabase'

type TerritoryMapProps = {
  label?: string
  compact?: boolean
  showLegend?: boolean
  allOrchards?: boolean
  orchardId?: string
}

function TerritoryMap({ label = 'Zona de análisis territorial', compact = false, showLegend = true }: TerritoryMapProps) {
  return (
    <section className={`territory-map ${compact ? 'territory-map-compact' : ''}`} aria-label={label}>
      <img src={landingImage} alt="Vista satelital de parcelas agrícolas" />
      <span className="map-polygon map-polygon-green" aria-hidden="true" />
      <span className="map-polygon map-polygon-berry" aria-hidden="true" />
      {showLegend && <div className="map-legend"><b>Capas de análisis</b><span><i className="legend-green" />Cobertura estable</span><span><i className="legend-amber" />Cambio detectado</span><span><i className="legend-berry" />Requiere revisión</span></div>}
      <p className="map-attribution">Vista de demostración · Integración Earth Engine pendiente</p>
    </section>
  )
}

type MapOrchard = { id: string; name: string; positions: [number, number][][]; geometry: unknown; crop: string }
type HistoricalImage = { year: number; thumbnailUrl?: string; tileUrlTemplate?: string; bounds?: [number, number, number, number] }

const agromichApi = import.meta.env.DEV ? '/agromich-api' : import.meta.env.VITE_AGROMICH_API_URL

function parseHistoricalImages(payload: unknown): HistoricalImage[] {
  if (!payload || typeof payload !== 'object') return []
  const data = payload as { imagenes?: unknown; resultados?: unknown; series?: unknown }
  const rows = data.imagenes ?? data.resultados ?? data.series
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const image = row as Record<string, unknown>
    const year = Number(image.anio ?? image.year)
    const thumbnailUrl = image.image_url ?? image.url ?? image.thumbnail_url
    const tileUrlTemplate = image.tile_url_template
    const bounds = image.bounds
    return Number.isFinite(year) && (typeof thumbnailUrl === 'string' || typeof tileUrlTemplate === 'string') ? [{ year, thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined, tileUrlTemplate: typeof tileUrlTemplate === 'string' ? tileUrlTemplate : undefined, bounds: Array.isArray(bounds) && bounds.length === 4 && bounds.every((value) => typeof value === 'number') ? bounds as [number, number, number, number] : undefined }] : []
  })
}

function parsePolygon(value: unknown): [number, number][][] | null {
  if (typeof value === 'string') {
    try { return parsePolygon(JSON.parse(value)) } catch { return null }
  }
  if (!value || typeof value !== 'object') return null
  const geometry = (value as { geometry?: unknown; type?: string; coordinates?: unknown }).geometry ?? value
  if (!geometry || typeof geometry !== 'object') return null
  const candidate = geometry as { type?: string; coordinates?: unknown }
  if (candidate.type !== 'Polygon' || !Array.isArray(candidate.coordinates)) return null
  const rings = candidate.coordinates as unknown[]
  const positions = rings.map((ring) => Array.isArray(ring) ? ring.map((point) => {
    if (!Array.isArray(point) || point.length < 2) return null
    const [longitude, latitude] = point
    return typeof latitude === 'number' && typeof longitude === 'number' ? [latitude, longitude] as [number, number] : null
  }).filter((point): point is [number, number] => point !== null) : [])
  return positions.length > 0 && positions[0].length >= 3 ? positions : null
}

function MapBounds({ orchards }: { orchards: MapOrchard[] }) {
  const map = useMap()
  useEffect(() => {
    const points = orchards.flatMap((orchard) => orchard.positions.flat())
    if (points.length) map.fitBounds(points, { padding: [28, 28], maxZoom: 15 })
  }, [map, orchards])
  return null
}

function OrchardPolygon({ orchard, index }: { orchard: MapOrchard; index: number }) {
  const map = useMap()
  const points = orchard.positions.flat()
  const center: [number, number] = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length]
  const latitudes = points.map((point) => point[0])
  const labelPosition: [number, number] = [Math.max(...latitudes) + Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * .28, .0005), center[1]]
  const focusOrchard = () => {
    map.fitBounds(points, { padding: [44, 44], maxZoom: 16 })
  }

  const color = index % 2 ? '#94c648' : '#d83877'
  return <><Polygon positions={orchard.positions} eventHandlers={{ click: focusOrchard }} pathOptions={{ color, fillColor: color, fillOpacity: .24, weight: 2 }} /><Polyline positions={[labelPosition, center]} pathOptions={{ color: '#fff', weight: 2, opacity: .9, interactive: false }} /><CircleMarker center={center} radius={3} pathOptions={{ color: '#fff', fillColor: '#fff', fillOpacity: 1, weight: 1, interactive: false }} /><Marker position={labelPosition} icon={divIcon({ className: 'orchard-label-anchor', iconSize: [1, 1], iconAnchor: [0, 0] })} interactive={false}><Tooltip permanent interactive={false} direction="top" offset={[0, -8]} className="territory-map-label">{orchard.name}</Tooltip></Marker></>
}

const orchardLoadingIcon = divIcon({ className: 'orchard-image-loader-marker', html: '<span aria-label="Cargando imagen histórica" role="status"></span>', iconSize: [44, 44], iconAnchor: [22, 22] })

function OrchardImageLoader({ orchard }: { orchard: MapOrchard }) {
  const points = orchard.positions[0]
  const center: [number, number] = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length]
  return <Marker position={center} icon={orchardLoadingIcon} interactive={false} />
}

function LiveTerritoryMap({ label = 'Territory map', compact = false, showLegend = true, allOrchards = false, orchardId }: TerritoryMapProps) {
  const [databaseOrchards, setDatabaseOrchards] = useState<MapOrchard[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('Actual')
  const [historicalImage, setHistoricalImage] = useState<HistoricalImage | null>(null)
  const [historicalImageError, setHistoricalImageError] = useState('')
  const [loadingHistoricalImage, setLoadingHistoricalImage] = useState(false)

  useEffect(() => {
    let active = true
    async function loadOrchards() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (active) setLoaded(true); return }
      for (const table of ['huertos']) {
        let query = supabase.from(table).select('*')
        if (orchardId) query = query.eq('id', orchardId)
        const { data, error } = await query
        if (error) continue
        const parsed = (data ?? []).flatMap((row: Record<string, unknown>) => {
          const positions = parsePolygon(row.geometry ?? row.geom ?? row.polygon ?? row.poligono ?? row.geojson)
          if (!positions) return []
          return [{ id: String(row.id ?? crypto.randomUUID()), name: String(row.nombre ?? row.name ?? 'Huerta sin nombre'), positions, geometry: row.geometry ?? row.geom ?? row.polygon ?? row.poligono ?? row.geojson, crop: String(row.cultivo ?? row.crop ?? '') }]
        })
        if (active) {
          setDatabaseOrchards(parsed)
          setLoaded(true)
        }
        return
      }
      if (active) setLoaded(true)
    }
    void loadOrchards()
    return () => { active = false }
  }, [allOrchards, orchardId])

  useEffect(() => {
    const orchard = databaseOrchards[0]
    if (!orchard || selectedPeriod === 'Actual' || !agromichApi) {
      const reset = window.setTimeout(() => setHistoricalImage(null), 0)
      const resetError = window.setTimeout(() => setHistoricalImageError(''), 0)
      return () => { window.clearTimeout(reset); window.clearTimeout(resetError) }
    }
    let active = true
    const year = Number(selectedPeriod)
    const requestBody = {
      geometry: orchard.geometry,
      anios: [year],
      cultivo: orchard.crop,
      visualizacion: 'rgb',
      mes_inicio: 1,
      mes_fin: 4,
    }
    void fetch(`${agromichApi}/api/v1/expediente/imagenes-historicas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }).then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar la imagen histórica.')
      const image = parseHistoricalImages(await response.json() as unknown).find((item) => item.year === year)
      if (!image) throw new Error('No hay imagen disponible para este año.')
      if (active) setHistoricalImage(image)
    }).catch(() => { if (active) { setHistoricalImage(null); setHistoricalImageError(`No hay imagen histórica disponible para ${selectedPeriod}.`); setLoadingHistoricalImage(false) } })
    return () => { active = false }
  }, [databaseOrchards, selectedPeriod])

  const visibleOrchards = databaseOrchards
  return <section className={`territory-map ${compact ? 'territory-map-compact' : ''}`} aria-label={label}>
    <MapContainer center={[19.425, -102.062]} zoom={14} scrollWheelZoom={false} className="territory-leaflet-map">
      <TileLayer attribution="&copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      {historicalImage?.tileUrlTemplate && <TileLayer key={historicalImage.tileUrlTemplate} url={historicalImage.tileUrlTemplate} bounds={historicalImage.bounds ? [[historicalImage.bounds[1], historicalImage.bounds[0]], [historicalImage.bounds[3], historicalImage.bounds[2]]] : undefined} opacity={1} eventHandlers={{ load: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) }, tileerror: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) } }} />}
      {historicalImage?.thumbnailUrl && !historicalImage.tileUrlTemplate && visibleOrchards[0] && <ImageOverlay url={historicalImage.thumbnailUrl} bounds={visibleOrchards[0].positions[0]} opacity={1} eventHandlers={{ load: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) }, error: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) } }} />}
      {loadingHistoricalImage && visibleOrchards[0] && <OrchardImageLoader orchard={visibleOrchards[0]} />}
      <MapBounds orchards={visibleOrchards} />
      {visibleOrchards.map((orchard, index) => <OrchardPolygon key={orchard.id} orchard={orchard} index={index} />)}
    </MapContainer>
    {orchardId && <div className="map-period-selector" role="group" aria-label="Periodo de imagen satelital">{['Actual', '2024', '2022', '2020', '2018'].map((period) => <button key={period} type="button" className={selectedPeriod === period ? 'is-selected' : ''} onClick={() => { setSelectedPeriod(period); setHistoricalImageError(''); setLoadingHistoricalImage(period !== 'Actual') }} aria-pressed={selectedPeriod === period}>{period}</button>)}</div>}
    {historicalImageError && <p className="map-image-status" role="status">{historicalImageError}</p>}
    {showLegend && <div className="map-legend"><b>Capas de analisis</b><span><i className="legend-green" />Cobertura estable</span><span><i className="legend-berry" />Requiere revision</span></div>}
    <p className="map-attribution">{!loaded ? 'Cargando huertas desde Supabase...' : databaseOrchards.length > 0 ? `${selectedPeriod === 'Actual' ? 'Vista actual' : `Vista ${selectedPeriod}`} · ${databaseOrchards.length} huerta(s) cargada(s)` : 'No hay huertas con poligono para mostrar'}</p>
  </section>
}

export default LiveTerritoryMap
export { TerritoryMap }
