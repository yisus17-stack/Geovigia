import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import OrchardDrawingMap, { type OrchardMapHandle } from '../map/OrchardDrawingMap'
import { parsePolygonCoordinates, type PolygonCoordinates } from '../../lib/polygon'
import { createHuerto, getHuerto, updateHuerto } from '../../lib/huertos'
import { closeLoading, showError, showLoading, showSuccess } from '../../lib/alerts'
import { supabase } from '../../lib/supabase'

type HuertoEditorFormProps = { huertoId?: string }

type FormData = { propietario: string; nombre: string; cultivo: string; municipio: string; localidad: string }

const emptyForm: FormData = { propietario: '', nombre: '', cultivo: 'aguacate', municipio: '', localidad: '' }

function getRegisteredOwner(metadata: Record<string, unknown> | undefined) {
  const fullName = metadata?.full_name ?? metadata?.name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()

  const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name.trim() : ''
  const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name.trim() : ''
  return [firstName, lastName].filter(Boolean).join(' ')
}

function isUnregisteredOwner(value: string | null | undefined) {
  return !value?.trim() || value.trim().toLocaleLowerCase('es-MX') === 'sin registrar'
}

function HuertoEditorForm({ huertoId }: HuertoEditorFormProps) {
  const navigate = useNavigate()
  const mapRef = useRef<OrchardMapHandle>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [polygon, setPolygon] = useState<PolygonCoordinates | null>(null)
  const [hectares, setHectares] = useState<number | null>(null)
  const [coordinates, setCoordinates] = useState('')
  const [loading, setLoading] = useState(Boolean(huertoId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!huertoId) return
    let active = true
    void getHuerto(huertoId).then((huerto) => {
      if (!active) return
      setForm({ propietario: huerto.propietario ?? '', nombre: huerto.nombre, cultivo: huerto.cultivo, municipio: huerto.municipio, localidad: huerto.localidad ?? '' })
      setPolygon(huerto.poligono?.coordinates ?? null)
      setHectares(huerto.superficie_ha)
    }).catch(() => { if (active) setError('No pudimos cargar esta huerta.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [huertoId])

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const registeredOwner = getRegisteredOwner(data.user?.user_metadata)
      if (!registeredOwner) return
      setForm((current) => isUnregisteredOwner(current.propietario)
        ? { ...current, propietario: registeredOwner }
        : current)
    })
    return () => { active = false }
  }, [loading])

  const updatePolygon = useCallback((coordinates: PolygonCoordinates | null, nextHectares: number | null) => {
    setPolygon(coordinates)
    setHectares(nextHectares)
  }, [])

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function locateOrTrace() {
    const polygon = parsePolygonCoordinates(coordinates)
    if (coordinates.trim() && polygon) {
      setPolygon(polygon)
      setError('')
      return
    }
    if (coordinates.trim() && !polygon) {
      setError('Las coordenadas no tienen un polígono válido. Usa JSON GeoJSON o pares [longitud, latitud].')
      return
    }
    const place = [form.localidad, form.municipio].filter(Boolean).join(', ')
    if (!place) {
      setError('Escribe un municipio o localidad para buscar la ubicación.')
      return
    }
    const found = await mapRef.current?.searchPlace(place)
    setError(found ? '' : 'No encontramos ese municipio o localidad. Puedes ubicarte y dibujar el polígono manualmente.')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!polygon) { setError('Dibuja o ajusta el poligono de la huerta antes de guardar.'); void showError('Falta el polígono', 'Dibuja o ajusta la huerta en el mapa antes de guardar.'); return }
    setSaving(true)
    setError('')
    showLoading(huertoId ? 'Guardando cambios...' : 'Registrando huerta...', 'Estamos guardando los datos y el polígono.')
    const input = { ...form, poligono: { type: 'Polygon' as const, coordinates: polygon }, superficie_ha: hectares }
    try {
      const saved = huertoId ? await updateHuerto(huertoId, input) : await createHuerto(input)
      closeLoading()
      await showSuccess(huertoId ? 'Cambios guardados' : 'Huerta registrada', 'La información quedó guardada correctamente.')
      navigate(`/auditor/huertas/${saved.id}`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo guardar la huerta.'
      closeLoading(); setError(message); void showError('No se pudo guardar', message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="loading-state">Cargando huerta...</p>

  return <form className="orchard-form orchard-registration" onSubmit={save}>
    <section className="form-panel"><div className="form-panel-heading"><p className="eyebrow">Información general</p><h2>{huertoId ? 'Edita los datos del predio' : 'Identifica el predio'}</h2><p>Completa únicamente la información de la huerta y su polígono.</p></div>
      <div className="form-fields">
        <label>Propietario<input required value={form.propietario} onChange={(event) => updateField('propietario', event.target.value)} placeholder="Ej. Eduardo Ramírez López" /></label>
        <label>Nombre de la huerta<input required value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} placeholder="Ej. Huerta La Esperanza" /></label>
        <label>Cultivo<select value={form.cultivo} onChange={(event) => updateField('cultivo', event.target.value)}><option value="aguacate">Aguacate</option><option value="berries">Berries</option><option value="otro">Otro</option></select></label>
        <label>Municipio<input required value={form.municipio} onChange={(event) => updateField('municipio', event.target.value)} onBlur={() => { void mapRef.current?.searchPlace(form.municipio) }} placeholder="Ej. Uruapan" /></label>
        <label>Localidad<input required value={form.localidad} onChange={(event) => updateField('localidad', event.target.value)} onBlur={() => { void mapRef.current?.searchPlace(`${form.localidad}, ${form.municipio}`) }} placeholder="Ej. Caltzontzin" /></label>
        <label className="coordinates-field">Coordenadas del polígono (opcional)<textarea value={coordinates} onChange={(event) => setCoordinates(event.target.value)} placeholder="[[[-102.105,19.462],[-102.095,19.462],[-102.095,19.472],[-102.105,19.472]]]" rows={3} /><small>Pega coordenadas GeoJSON en formato [longitud, latitud]. Si las dejas vacías, busca el lugar y dibuja el terreno.</small></label>
        <button type="button" className="button button-quiet location-button" onClick={() => { void locateOrTrace() }}>Buscar ubicación o trazar polígono</button>
      </div>
    </section>
    <section className="drawing-section form-panel"><div className="form-panel-heading"><p className="eyebrow">Delimita tu huerta</p><h2>Edita los puntos directamente en el mapa.</h2><p>Usa “Editar puntos” para arrastrar vértices, o “Dibujar terreno” para crear un nuevo polígono.</p></div>
      <div className="drawing-map"><OrchardDrawingMap ref={mapRef} initialPolygon={polygon} label={form.nombre} onPolygonChange={updatePolygon} /><div className="drawing-status"><span>Superficie calculada</span><b>{hectares === null ? '— ha' : `${hectares.toFixed(2)} ha`}</b><small>{polygon ? 'Polígono listo para guardar.' : 'Dibuja un polígono para calcularla.'}</small></div></div>
      <div className="map-actions"><button type="button" className="button button-quiet" onClick={() => mapRef.current?.locate()}>Mi ubicación</button><button type="button" className="button" onClick={() => mapRef.current?.startDrawing()}>Dibujar terreno</button><button type="button" className="button button-quiet" onClick={() => mapRef.current?.editPolygon()}>Editar puntos</button><button type="button" className="text-button" onClick={() => mapRef.current?.clearPolygon()}>Borrar polígono</button></div>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-submit"><p>Al guardar se actualizan los datos y la geometría de esta huerta.</p><button className="button" type="submit" disabled={saving}>{saving ? 'Guardando...' : huertoId ? 'Guardar cambios →' : 'Guardar huerta →'}</button></div>
  </form>
}

export default HuertoEditorForm
