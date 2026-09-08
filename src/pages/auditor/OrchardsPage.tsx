import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { getHuertos, type Huerto } from '../../lib/huertos'

function OrchardsPage() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [crop, setCrop] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; void getHuertos().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las huertas.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const filtered = useMemo(() => huertos.filter((huerto) => crop === 'Todos' || huerto.cultivo.toLowerCase() === crop.toLowerCase()), [crop, huertos])
  return <AppLayout><header className="page-header"><div><p className="eyebrow">Auditorías / Huertas</p><h1>Huertas registradas</h1><p>Consulta, delimita y edita los predios que administra tu cuenta de Auditor.</p></div><Link className="button" to="/auditor/huertas/nuevo">+ Registrar huerta</Link></header><select className="crop-filter" aria-label="Filtrar por cultivo" value={crop} onChange={(event) => setCrop(event.target.value)}><option>Todos</option><option value="aguacate">Aguacate</option><option value="berries">Berries</option><option value="otro">Otro</option></select>{loading && <p className="loading-state">Cargando huertas…</p>}{error && <p className="form-error" role="alert">{error}</p>}{!loading && !error && <div className="data-table"><div className="table-head"><span>Huerta</span><span>Ubicación</span><span>Superficie</span><span>Polígono</span><span>Estado</span><span /></div>{filtered.map((huerto) => <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{huerto.cultivo}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span>{huerto.poligono ? 'Delimitado' : 'Pendiente'}</span><span>{huerto.estado}</span><Link to={`/auditor/huertas/${huerto.id}`}>Abrir →</Link></div>)}{filtered.length === 0 && <p className="empty-state">Aún no hay huertas registradas. Crea la primera para comenzar.</p>}</div>}</AppLayout>
}

export default OrchardsPage
