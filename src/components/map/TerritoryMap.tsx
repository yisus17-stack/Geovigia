import landingImage from '../../assets/landing.png'
import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { supabase } from '../../lib/supabase'

type TerritoryMapProps = {
  label?: string
  compact?: boolean
  showLegend?: boolean
  allOrchards?: boolean
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

type MapOrchard = { id: string; name: string; positions: [number, number][][] }

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
  const focusOrchard = () => {
    const points = orchard.positions.flat()
    map.fitBounds(points, { padding: [44, 44], maxZoom: 16 })
  }

  const color = index % 2 ? '#94c648' : '#d83877'
  return <Polygon positions={orchard.positions} eventHandlers={{ click: focusOrchard }} pathOptions={{ color, fillColor: color, fillOpacity: .24, weight: 2 }}>
    <Tooltip permanent interactive direction="center" className="territory-map-label">{orchard.name}</Tooltip>
  </Polygon>
}

function LiveTerritoryMap({ label = 'Territory map', compact = false, showLegend = true, allOrchards = false }: TerritoryMapProps) {
  const [databaseOrchards, setDatabaseOrchards] = useState<MapOrchard[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    async function loadOrchards() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (active) setLoaded(true); return }
      for (const table of ['huertos']) {
        let query = supabase.from(table).select('*')
        if (!allOrchards) query = query.eq('propietario_id', auth.user.id)
        const { data, error } = await query
        if (error) continue
        const parsed = (data ?? []).flatMap((row: Record<string, unknown>) => {
          const positions = parsePolygon(row.geometry ?? row.geom ?? row.polygon ?? row.poligono ?? row.geojson)
          if (!positions) return []
          return [{ id: String(row.id ?? crypto.randomUUID()), name: String(row.nombre ?? row.name ?? 'Huerta sin nombre'), positions }]
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
  }, [allOrchards])

  const visibleOrchards = databaseOrchards
  return <section className={`territory-map ${compact ? 'territory-map-compact' : ''}`} aria-label={label}>
    <MapContainer center={[19.425, -102.062]} zoom={14} scrollWheelZoom={false} className="territory-leaflet-map">
      <TileLayer attribution="&copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      <MapBounds orchards={visibleOrchards} />
      {visibleOrchards.map((orchard, index) => <OrchardPolygon key={orchard.id} orchard={orchard} index={index} />)}
    </MapContainer>
    {showLegend && <div className="map-legend"><b>Capas de analisis</b><span><i className="legend-green" />Cobertura estable</span><span><i className="legend-berry" />Requiere revision</span></div>}
    <p className="map-attribution">{!loaded ? 'Cargando huertas desde Supabase...' : databaseOrchards.length > 0 ? `${databaseOrchards.length} huerta(s) cargada(s) desde Supabase` : 'No hay huertas con poligono para mostrar'}</p>
  </section>
}

export default LiveTerritoryMap
export { TerritoryMap }
