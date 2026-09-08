import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import { actualizarEstadoHuerto, getHuertoAuditoria } from '../../lib/auditoria'
import type { Huerto } from '../../lib/huertos'

function RevisionPage() {
  const { id = '' } = useParams()
  const [huerto, setHuerto] = useState<Huerto | null>(null)
  const [estado, setEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void getHuertoAuditoria(id).then((row) => {
      if (!active) return
      setHuerto(row)
      setEstado(row.estado)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar esta huerta.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!huerto) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const updated = await actualizarEstadoHuerto(huerto.id, estado)
      setHuerto(updated)
      setEstado(updated.estado)
      setMessage('Estado actualizado en Supabase.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.')
    } finally {
      setSaving(false)
    }
  }

  return <AppLayout role="auditor">
    {loading && <p className="loading-state">Cargando huerta desde Supabase…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && huerto && <><header className="page-header"><div><p className="eyebrow">Revisión de huerta</p><h1>{huerto.nombre}</h1><p>{huerto.municipio} · {huerto.localidad} · {huerto.superficie_ha?.toFixed(2) ?? '—'} ha</p></div></header><TerritoryMap allOrchards label={`Mapa de ${huerto.nombre}`} /><section className="two-column"><div><p className="eyebrow">Datos del predio</p><h2>Información registrada</h2><dl className="evidence-list"><div><dt>Cultivo</dt><dd>{huerto.cultivo}</dd></div><div><dt>Estado actual</dt><dd>{huerto.estado}</dd></div><div><dt>Polígono</dt><dd>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{new Date(huerto.created_at).toLocaleDateString('es-MX')}</dd></div></dl></div><form className="review-form" onSubmit={(event) => { void saveStatus(event) }}><p className="eyebrow">Panel de revisión</p><h2>Actualizar estado</h2><label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="requiere revisión">Requiere revisión</option><option value="requiere información">Requiere información</option></select></label><p>Este cambio se guardará en el campo <b>estado</b> de la tabla <b>huertos</b>.</p><button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar estado'}</button>{message && <p className="success-message" role="status">{message}</p>}</form></section></>}
  </AppLayout>
}

export default RevisionPage
