import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import OrchardDrawingMap, { type OrchardMapHandle, type PolygonCoordinates } from '../map/OrchardDrawingMap'
import { createHuerto, getHuerto, updateHuerto } from '../../lib/huertos'

type HuertoEditorFormProps = { huertoId?: string }

type FormData = { nombre: string; cultivo: string; municipio: string; localidad: string }

const emptyForm: FormData = { nombre: '', cultivo: 'aguacate', municipio: '', localidad: '' }

function HuertoEditorForm({ huertoId }: HuertoEditorFormProps) {
  const navigate = useNavigate()
  const mapRef = useRef<OrchardMapHandle>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [polygon, setPolygon] = useState<PolygonCoordinates | null>(null)
  const [hectares, setHectares] = useState<number | null>(null)
  const [loading, setLoading] = useState(Boolean(huertoId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!huertoId) return
    let active = true
    void getHuerto(huertoId).then((huerto) => {
      if (!active) return
      setForm({ nombre: huerto.nombre, cultivo: huerto.cultivo, municipio: huerto.municipio, localidad: huerto.localidad })
      setPolygon(huerto.poligono?.coordinates ?? null)
      setHectares(huerto.superficie_ha)
    }).catch(() => { if (active) setError('No pudimos cargar esta huerta.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [huertoId])

  const updatePolygon = useCallback((coordinates: PolygonCoordinates | null, nextHectares: number | null) => {
    setPolygon(coordinates)
    setHectares(nextHectares)
  }, [])

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!polygon) { setError('Dibuja o ajusta el poligono de la huerta antes de guardar.'); return }
    setSaving(true)
    setError('')
    const input = { ...form, poligono: { type: 'Polygon' as const, coordinates: polygon }, superficie_ha: hectares }
    try {
      const saved = huertoId ? await updateHuerto(huertoId, input) : await createHuerto(input)
      navigate(`/productor/huertos/${saved.id}/editar`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la huerta.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="loading-state">Cargando huerta...</p>

  return <form className="orchard-form orchard-registration" onSubmit={save}>
    <section className="form-panel"><div className="form-panel-heading"><p className="eyebrow">Información general</p><h2>{huertoId ? 'Edita los datos del predio' : 'Identifica el predio'}</h2><p>Los datos y el polígono se guardarán en tu cuenta de Supabase.</p></div>
      <div className="form-fields">
        <label>Nombre<input required value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} placeholder="Ej. Huerta La Esperanza" /></label>
        <label>Cultivo<select value={form.cultivo} onChange={(event) => updateField('cultivo', event.target.value)}><option value="aguacate">Aguacate</option><option value="berries">Berries</option><option value="otro">Otro</option></select></label>
        <label>Municipio<input required value={form.municipio} onChange={(event) => updateField('municipio', event.target.value)} onBlur={() => { void mapRef.current?.searchPlace(form.municipio) }} placeholder="Ej. Uruapan" /></label>
        <label>Localidad<input required value={form.localidad} onChange={(event) => updateField('localidad', event.target.value)} onBlur={() => { void mapRef.current?.searchPlace(`${form.localidad}, ${form.municipio}`) }} placeholder="Ej. Caltzontzin" /></label>
      </div>
    </section>
    <section className="drawing-section form-panel"><div className="form-panel-heading"><p className="eyebrow">Delimita tu huerta</p><h2>Edita los puntos directamente en el mapa.</h2><p>Usa “Editar puntos” para arrastrar vértices, o “Dibujar terreno” para crear un nuevo polígono.</p></div>
      <div className="drawing-map"><OrchardDrawingMap ref={mapRef} initialPolygon={polygon} onPolygonChange={updatePolygon} /><div className="drawing-status"><span>Superficie calculada</span><b>{hectares === null ? '— ha' : `${hectares.toFixed(2)} ha`}</b><small>{polygon ? 'Polígono listo para guardar.' : 'Dibuja un polígono para calcularla.'}</small></div></div>
      <div className="map-actions"><button type="button" className="button button-quiet" onClick={() => mapRef.current?.locate()}>Mi ubicación</button><button type="button" className="button" onClick={() => mapRef.current?.startDrawing()}>Dibujar terreno</button><button type="button" className="button button-quiet" onClick={() => mapRef.current?.editPolygon()}>Editar puntos</button><button type="button" className="text-button" onClick={() => mapRef.current?.clearPolygon()}>Borrar polígono</button></div>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-submit"><p>Al guardar se actualizan los datos y la geometría de esta huerta.</p><button className="button" type="submit" disabled={saving}>{saving ? 'Guardando...' : huertoId ? 'Guardar cambios →' : 'Guardar huerta →'}</button></div>
  </form>
}

export default HuertoEditorForm
