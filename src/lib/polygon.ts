export type PolygonCoordinates = number[][][]

export function parsePolygonCoordinates(value: string): PolygonCoordinates | null {
  const text = value.trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as unknown
    const coordinates = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'coordinates' in parsed
      ? (parsed as { coordinates?: unknown }).coordinates
      : parsed
    if (!Array.isArray(coordinates)) return null
    const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates
    if (!Array.isArray(ring) || ring.length < 3) return null
    const points = ring.map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null
      const longitude = Number(point[0])
      const latitude = Number(point[1])
      return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null
    })
    if (points.some((point) => point === null)) return null
    const validPoints = points as number[][]
    const first = validPoints[0]
    const last = validPoints[validPoints.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) validPoints.push([...first])
    return [validPoints]
  } catch {
    return null
  }
}
