import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertos, type Huerto } from '../../lib/huertos'

function OrchardsPage() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [crop, setCrop] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getHuertos().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus huertas.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => huertos.filter((huerto) => crop === 'Todos' || huerto.cultivo.toLowerCase() === crop.toLowerCase()), [crop, huertos])

  return <AppLayout role="productor">
    <header className="page-header"><div><p className="eyebrow">Productor / Huertas</p><h1>Mis huertas</h1><p>Registros reales de tu cuenta y sus polígonos guardados.</p></div><Link className="button" to="/productor/huertos/nuevo">+ Nueva huerta</Link></header>
    <select className="crop-filter" aria-label="Filtrar por cultivo" value={crop} onChange={(event) => setCrop(event.target.value)}><option value="Todos">Todos los cultivos</option><option value="aguacate">Aguacate</option><option value="berries">Berries</option><option value="otro">Otro</option></select>
    {loading && <p className="loading-state">Cargando tus huertas…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && <div className="data-table"><div className="table-head"><span>Huerta</span><span>Ubicación</span><span>Superficie</span><span>Polígono</span><span>Estado</span><span /></div>{filtered.map((huerto) => <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{huerto.cultivo}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</span><span>{huerto.estado}</span><Link to={`/productor/huertos/${huerto.id}`}>Ver huerta →</Link></div>)}{filtered.length === 0 && <p className="empty-state">Aún no tienes huertas registradas. Crea la primera para verla aquí y en el mapa.</p>}</div>}
  </AppLayout>
}

export default OrchardsPage
