import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import * as L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'

export type PolygonCoordinates = number[][][]

export type OrchardMapHandle = {
  locate: () => void
  searchPlace: (place: string) => Promise<boolean>
  startDrawing: () => void
  editPolygon: () => void
  clearPolygon: () => void
}

type OrchardDrawingMapProps = {
  initialPolygon?: PolygonCoordinates | null
  onPolygonChange: (coordinates: PolygonCoordinates | null, hectares: number | null) => void
}

type LayerEvent = L.LeafletEvent & { layer: L.Layer }

function listenToPolygonChanges(layer: L.Polygon, emitPolygon: (polygon: L.Polygon) => void) {
  const onLayerChange = () => emitPolygon(layer)
  layer.on('pm:edit', onLayerChange)
  layer.on('pm:change', onLayerChange)
  return () => {
    layer.off('pm:edit', onLayerChange)
    layer.off('pm:change', onLayerChange)
  }
}

function calculateHectares(points: L.LatLng[]) {
  if (points.length < 3) return 0
  const meanLatitude = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const metersPerLatitudeDegree = 111_320
  const metersPerLongitudeDegree = 111_320 * Math.cos((meanLatitude * Math.PI) / 180)
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += (current.lng * metersPerLongitudeDegree) * (next.lat * metersPerLatitudeDegree)
    area -= (next.lng * metersPerLongitudeDegree) * (current.lat * metersPerLatitudeDegree)
  }
  return Math.abs(area / 2) / 10_000
}

const MapControls = forwardRef<OrchardMapHandle, OrchardDrawingMapProps>(function MapControls({ initialPolygon, onPolygonChange }, ref) {
  const map = useMap()
  const layerRef = useRef<L.Polygon | null>(null)
  const loadedInitialRef = useRef(false)

  const emitPolygon = useCallback((layer: L.Polygon | null) => {
    if (!layer) {
      onPolygonChange(null, null)
      return
    }
    const rings = layer.getLatLngs()
    const firstRing = rings[0]
    if (!Array.isArray(firstRing) || firstRing.length < 3) return
    const points = firstRing as L.LatLng[]
    onPolygonChange([points.map((point) => [point.lng, point.lat])], calculateHectares(points))
  }, [onPolygonChange])

  useEffect(() => {
    map.pm.addControls({
      position: 'topright',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    })
    const onCreate = (event: LayerEvent) => {
      if (!(event.layer instanceof L.Polygon)) return
      layerRef.current?.remove()
      layerRef.current = event.layer
      listenToPolygonChanges(event.layer, emitPolygon)
      emitPolygon(event.layer)
    }
    const onEdit = (event: LayerEvent) => {
      if (event.layer instanceof L.Polygon) emitPolygon(event.layer)
    }
    const onRemove = () => {
      layerRef.current = null
      emitPolygon(null)
    }
    map.on('pm:create', onCreate)
    map.on('pm:edit', onEdit)
    map.on('pm:remove', onRemove)
    return () => {
      map.off('pm:create', onCreate)
      map.off('pm:edit', onEdit)
      map.off('pm:remove', onRemove)
      map.pm.removeControls()
    }
  }, [emitPolygon, map])

  useEffect(() => {
    if (loadedInitialRef.current || !initialPolygon?.[0]?.length) return
    const points = initialPolygon[0].map(([longitude, latitude]) => L.latLng(latitude, longitude))
    if (points.length < 3) return
    const layer = L.polygon(points, { color: '#23824f', weight: 2, fillOpacity: .16 }).addTo(map)
    layerRef.current = layer
    loadedInitialRef.current = true
    listenToPolygonChanges(layer, emitPolygon)
    map.fitBounds(layer.getBounds(), { padding: [28, 28] })
    emitPolygon(layer)
  }, [emitPolygon, initialPolygon, map])

  useImperativeHandle(ref, () => ({
    locate: () => map.locate({ setView: true, maxZoom: 16 }),
    searchPlace: async (place: string) => {
      const query = place.trim()
      if (query.length < 2) return false
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=${encodeURIComponent(`${query}, Michoacan, Mexico`)}`)
        if (!response.ok) return false
        const results: { lat: string; lon: string }[] = await response.json()
        const match = results[0]
        if (!match) return false
        map.flyTo([Number(match.lat), Number(match.lon)], 14, { duration: .8 })
        return true
      } catch {
        return false
      }
    },
    startDrawing: () => map.pm.enableDraw('Polygon'),
    editPolygon: () => map.pm.enableGlobalEditMode(),
    clearPolygon: () => {
      layerRef.current?.remove()
      layerRef.current = null
      emitPolygon(null)
    },
  }))

  return null
})

const OrchardDrawingMap = forwardRef<OrchardMapHandle, OrchardDrawingMapProps>(function OrchardDrawingMap({ initialPolygon, onPolygonChange }, ref) {
  return <MapContainer className="leaflet-orchard-map" center={[19.42, -102.06]} zoom={13} scrollWheelZoom>
    <TileLayer
      attribution="&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    />
    <MapControls ref={ref} initialPolygon={initialPolygon} onPolygonChange={onPolygonChange} />
  </MapContainer>
})

export default OrchardDrawingMap
