import landingImage from '../../assets/landing.png'
import { useCallback, useEffect, useState } from 'react'
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
  onOrchardsLoaded?: (orchards: MapOrchard[]) => void
  onOrchardSelect?: (orchard: MapOrchard | null) => void
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

export type MapOrchard = {
  id: string
  name: string
  positions: [number, number][][]
  geometry: unknown
  crop: string
  municipality: string
  locality: string
  area: number | null
  status: string
  createdAt: string
}
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

function parseSavedHistoricalImages(rows: unknown[]): HistoricalImage[] {
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const image = row as Record<string, unknown>
    const year = Number(image.anio)
    const thumbnailUrl = image.thumbnail_url
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

function MapBounds({ orchards, onChangingBounds }: { orchards: MapOrchard[]; onChangingBounds: () => void }) {
  const map = useMap()
  useEffect(() => {
    const points = orchards.flatMap((orchard) => orchard.positions.flat())
    if (points.length) {
      onChangingBounds()
      map.fitBounds(points, { padding: [28, 28], maxZoom: 15 })
    }
  }, [map, onChangingBounds, orchards])
  return null
}

function ResetMapBounds({ orchards, resetKey }: { orchards: MapOrchard[]; resetKey: number }) {
  const map = useMap()
  useEffect(() => {
    if (!resetKey) return
    const points = orchards.flatMap((orchard) => orchard.positions.flat())
    if (points.length) map.flyToBounds(points, { padding: [28, 28], maxZoom: 15, duration: .65 })
  }, [map, orchards, resetKey])
  return null
}

function MapZoomLimit({ maxZoom }: { maxZoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setMaxZoom(maxZoom)
    if (map.getZoom() > maxZoom) map.flyTo(map.getCenter(), maxZoom, { duration: .35 })
  }, [map, maxZoom])
  return null
}

function OrchardPolygon({ orchard, index, onSelect }: { orchard: MapOrchard; index: number; onSelect?: (orchard: MapOrchard) => void }) {
  const map = useMap()
  const points = orchard.positions.flat()
  const center: [number, number] = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length]
  const latitudes = points.map((point) => point[0])
  const labelPosition: [number, number] = [center[0] + (Math.max(...latitudes) - center[0]) * .45, center[1]]
  const zoomToOrchard = () => {
    map.flyToBounds(points, { padding: [44, 44], maxZoom: 16, duration: .65 })
  }
  const focusOrchard = () => {
    zoomToOrchard()
    onSelect?.(orchard)
  }

  const color = index % 2 ? '#94c648' : '#d83877'
  return <><Polygon positions={orchard.positions} eventHandlers={{ click: focusOrchard }} pathOptions={{ color, fillColor: color, fillOpacity: .24, weight: 2 }} /><Polyline positions={[labelPosition, center]} pathOptions={{ color: '#fff', weight: 2, opacity: .9, interactive: false }} /><CircleMarker center={center} radius={3} pathOptions={{ color: '#fff', fillColor: '#fff', fillOpacity: 1, weight: 1, interactive: false }} /><Marker position={labelPosition} icon={divIcon({ className: 'orchard-label-anchor', iconSize: [1, 1], iconAnchor: [0, 0] })} eventHandlers={{ click: focusOrchard }} alt={`Acercar a ${orchard.name}`}><Tooltip permanent interactive direction="top" offset={[0, -8]} className="territory-map-label" eventHandlers={{ click: focusOrchard }}>{orchard.name}</Tooltip></Marker></>
}

const orchardLoadingIcon = divIcon({ className: 'orchard-image-loader-marker', html: '<span aria-label="Cargando imagen histórica" role="status"></span>', iconSize: [44, 44], iconAnchor: [22, 22] })

function OrchardImageLoader({ orchard }: { orchard: MapOrchard }) {
  const points = orchard.positions[0]
  const center: [number, number] = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length]
  return <Marker position={center} icon={orchardLoadingIcon} interactive={false} />
}

function LiveTerritoryMap({ label = 'Territory map', compact = false, showLegend = true, allOrchards = false, orchardId, onOrchardsLoaded, onOrchardSelect }: TerritoryMapProps) {
  const [databaseOrchards, setDatabaseOrchards] = useState<MapOrchard[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('Actual')
  const [historicalImage, setHistoricalImage] = useState<HistoricalImage | null>(null)
  const [savedHistoricalImages, setSavedHistoricalImages] = useState<HistoricalImage[]>([])
  const [savedImagesLoaded, setSavedImagesLoaded] = useState(false)
  const [historicalImageError, setHistoricalImageError] = useState('')
  const [loadingHistoricalImage, setLoadingHistoricalImage] = useState(false)
  const [baseMapLoaded, setBaseMapLoaded] = useState(false)
  const [focusedOrchardId, setFocusedOrchardId] = useState<string | null>(null)
  const [resetMapKey, setResetMapKey] = useState(0)
  const handleChangingBounds = useCallback(() => setBaseMapLoaded(false), [])
  const availablePeriods = ['Actual', '2025', '2024', '2023', '2022', '2021', '2020']
  const selectedYear = Number(selectedPeriod)
  const sentinelYear = Number.isInteger(selectedYear) && selectedYear >= 2020 && selectedYear <= 2025 ? selectedYear : null
  const sentinelTileUrl = sentinelYear ? `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${sentinelYear}_3857/default/g/{z}/{y}/{x}.jpg` : null

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
          return [{
            id: String(row.id ?? crypto.randomUUID()),
            name: String(row.nombre ?? row.name ?? 'Huerta sin nombre'),
            positions,
            geometry: row.geometry ?? row.geom ?? row.polygon ?? row.poligono ?? row.geojson,
            crop: String(row.cultivo ?? row.crop ?? ''),
            municipality: String(row.municipio ?? ''),
            locality: String(row.localidad ?? ''),
            area: typeof row.superficie_ha === 'number' ? row.superficie_ha : null,
            status: String(row.estado ?? 'Sin estado'),
            createdAt: String(row.created_at ?? ''),
          }]
        })
        if (active) {
          setDatabaseOrchards(parsed)
          onOrchardsLoaded?.(parsed)
          setLoaded(true)
        }
        return
      }
      if (active) setLoaded(true)
    }
    void loadOrchards()
    return () => { active = false }
  }, [allOrchards, onOrchardsLoaded, orchardId])

  useEffect(() => {
    const orchard = databaseOrchards[0]
    if (!orchard) {
      const reset = window.setTimeout(() => { setSavedHistoricalImages([]); setSavedImagesLoaded(true) }, 0)
      return () => window.clearTimeout(reset)
    }
    let active = true
    void (async () => {
      setSavedImagesLoaded(false)
      let images: HistoricalImage[] = []
      try {
        const { data: analysis, error: analysisError } = await supabase.from('analisis').select('id').eq('huerto_id', orchard.id).order('completado_at', { ascending: false }).limit(1).maybeSingle()
        if (!analysisError && analysis) {
          const { data, error } = await supabase.from('imagenes_analisis').select('anio, thumbnail_url, tile_url_template, bounds').eq('analisis_id', analysis.id)
          if (!error) images = parseSavedHistoricalImages(data ?? [])
        }
      } finally {
        if (active) { setSavedHistoricalImages(images); setSavedImagesLoaded(true) }
      }
    })()
    return () => { active = false }
  }, [databaseOrchards])

  useEffect(() => {
    const orchard = databaseOrchards[0]
    if (!orchard || selectedPeriod === 'Actual' || !agromichApi) {
      const reset = window.setTimeout(() => setHistoricalImage(null), 0)
      const resetError = window.setTimeout(() => setHistoricalImageError(''), 0)
      return () => { window.clearTimeout(reset); window.clearTimeout(resetError) }
    }
    if (sentinelYear) {
      const reset = window.setTimeout(() => { setHistoricalImage(null); setHistoricalImageError(''); setLoadingHistoricalImage(false) }, 0)
      return () => window.clearTimeout(reset)
    }
    if (!savedImagesLoaded) return
    let active = true
    const year = Number(selectedPeriod)
    const savedImage = savedHistoricalImages.find((image) => image.year === year)
    if (savedImage) {
      const applySavedImage = window.setTimeout(() => {
        if (!active) return
        setHistoricalImage(savedImage)
        setHistoricalImageError('')
        setLoadingHistoricalImage(false)
      }, 0)
      return () => { active = false; window.clearTimeout(applySavedImage) }
    }
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
  }, [databaseOrchards, savedHistoricalImages, savedImagesLoaded, selectedPeriod, sentinelYear])

  const visibleOrchards = databaseOrchards
  const selectOrResetOrchard = useCallback((orchard: MapOrchard) => {
    if (focusedOrchardId === orchard.id) {
      setFocusedOrchardId(null)
      setResetMapKey((current) => current + 1)
      onOrchardSelect?.(null)
      return
    }
    setFocusedOrchardId(orchard.id)
    onOrchardSelect?.(orchard)
  }, [focusedOrchardId, onOrchardSelect])

  return <section className={`territory-map ${compact ? 'territory-map-compact' : ''}`} aria-label={label}>
    <MapContainer center={[19.425, -102.062]} zoom={14} scrollWheelZoom={false} className="territory-leaflet-map">
      <TileLayer attribution="&copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" eventHandlers={{ load: () => setBaseMapLoaded(true), tileerror: () => setBaseMapLoaded(true) }} />
      {sentinelTileUrl && <TileLayer key={sentinelTileUrl} attribution="Sentinel-2 Cloudless by EOX" url={sentinelTileUrl} maxNativeZoom={14} maxZoom={14} opacity={1} eventHandlers={{ load: () => setLoadingHistoricalImage(false), tileerror: () => { setLoadingHistoricalImage(false); setHistoricalImageError(`No se pudo cargar Sentinel-2 para ${sentinelYear}.`) } }} />}
      <MapZoomLimit maxZoom={sentinelTileUrl ? 14 : 18} />
      {historicalImage?.tileUrlTemplate && <TileLayer key={historicalImage.tileUrlTemplate} url={historicalImage.tileUrlTemplate} bounds={historicalImage.bounds ? [[historicalImage.bounds[1], historicalImage.bounds[0]], [historicalImage.bounds[3], historicalImage.bounds[2]]] : undefined} opacity={1} eventHandlers={{ load: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) }, tileerror: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) } }} />}
      {historicalImage?.thumbnailUrl && !historicalImage.tileUrlTemplate && visibleOrchards[0] && <ImageOverlay url={historicalImage.thumbnailUrl} bounds={visibleOrchards[0].positions[0]} opacity={1} eventHandlers={{ load: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) }, error: () => { if (historicalImage.year === Number(selectedPeriod)) setLoadingHistoricalImage(false) } }} />}
      {loadingHistoricalImage && visibleOrchards[0] && <OrchardImageLoader orchard={visibleOrchards[0]} />}
      <MapBounds orchards={visibleOrchards} onChangingBounds={handleChangingBounds} />
      <ResetMapBounds orchards={visibleOrchards} resetKey={resetMapKey} />
      {visibleOrchards.map((orchard, index) => <OrchardPolygon key={orchard.id} orchard={orchard} index={index} onSelect={selectOrResetOrchard} />)}
    </MapContainer>
    {(!loaded || !baseMapLoaded) && <div className="territory-map-loader" role="status" aria-live="polite"><span aria-hidden="true" /><p>Cargando mapa…</p></div>}
    {orchardId && <div className="map-period-selector" role="group" aria-label="Periodo de imagen satelital">{availablePeriods.map((period) => <button key={period} type="button" className={selectedPeriod === period ? 'is-selected' : ''} onClick={() => { setSelectedPeriod(period); setHistoricalImageError(''); setLoadingHistoricalImage(period !== 'Actual') }} aria-pressed={selectedPeriod === period}>{period}</button>)}</div>}
    {historicalImageError && <p className="map-image-status" role="status">{historicalImageError}</p>}
    {showLegend && <div className="map-legend" aria-label="Leyenda del mapa"><b>Leyenda</b><span><i className="legend-green" />Huerta activa</span><span><i className="legend-berry" />Auditoría pendiente</span><span><i className="legend-marker" />Marcador y nombre</span><small>El contorno indica el polígono registrado.</small></div>}
    <p className="map-attribution">{!loaded ? 'Cargando huertas desde Supabase...' : databaseOrchards.length > 0 ? `${selectedPeriod === 'Actual' ? 'Vista actual' : `Vista ${selectedPeriod}`} · ${databaseOrchards.length} huerta(s) cargada(s)` : 'No hay huertas con poligono para mostrar'}</p>
  </section>
}

export default LiveTerritoryMap
export { TerritoryMap }
