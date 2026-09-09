import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions, type Plugin } from 'chart.js'
import AppLayout from '../../components/AppLayout'
import { getHuertos, type Huerto } from '../../lib/huertos'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const municipalityTotalLabels: Plugin<'bar'> = {
  id: 'municipalityTotalLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data, scales } = chart
    ctx.save()
    ctx.fillStyle = '#17352a'
    ctx.font = '700 12px Outfit, sans-serif'
    ctx.textAlign = 'center'
    data.labels?.forEach((_, index) => {
      const total = data.datasets.reduce((sum, dataset) => sum + Number(dataset.data[index] ?? 0), 0)
      if (total > 0) ctx.fillText(String(total), scales.x.getPixelForValue(index), scales.y.getPixelForValue(total) - 9)
    })
    ctx.restore()
  },
}

ChartJS.register(municipalityTotalLabels)

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

const municipalityChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 550 },
  layout: { padding: { top: 14 } },
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxHeight: 9, boxWidth: 9, color: '#52605a', font: { size: 11, weight: 600 }, padding: 14, usePointStyle: true } },
    tooltip: {
      backgroundColor: '#073d2d',
      caretSize: 5,
      cornerRadius: 8,
      padding: 10,
      callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} ${context.parsed.y === 1 ? 'huerta' : 'huertas'}` },
    },
  },
  scales: {
    x: { stacked: true, border: { display: false }, grid: { display: false }, ticks: { color: '#52605a', font: { family: 'Outfit, sans-serif', size: 12, weight: 600 }, maxRotation: 0 } },
    y: { stacked: true, beginAtZero: true, border: { display: false }, grid: { color: 'rgba(32, 59, 49, .10)' }, ticks: { color: '#6d7b74', font: { size: 11 }, precision: 0, stepSize: 1 } },
  },
}

function HuertasPage() {
  const [huertos, setHuertos] = useState<Huerto[]>([])
  const [query, setQuery] = useState('')
  const [crop, setCrop] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [status, setStatus] = useState('')
  const [polygon, setPolygon] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    void getHuertos().then((rows) => { if (active) setHuertos(rows) }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las huertas.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const municipalities = useMemo(() => [...new Set(huertos.map((huerto) => huerto.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [huertos])
  const statuses = useMemo(() => [...new Set(huertos.map((huerto) => huerto.estado).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [huertos])
  const municipalityBreakdown = useMemo(() => Object.entries(huertos.reduce<Record<string, number>>((counts, huerto) => {
    const municipalityName = huerto.municipio || 'Sin municipio'
    counts[municipalityName] = (counts[municipalityName] ?? 0) + 1
    return counts
  }, {})).sort(([, first], [, second]) => second - first).slice(0, 6), [huertos])
  const municipalityChartData = useMemo(() => {
    const labels = municipalityBreakdown.map(([municipalityName]) => municipalityName)
    const cropTypes = [...new Set(huertos.filter((huerto) => labels.includes(huerto.municipio || 'Sin municipio')).map((huerto) => huerto.cultivo || 'Otro'))]
    const cropStyle = (cropName: string) => {
      const value = normalize(cropName)
      if (value.includes('aguacate')) return { label: 'Aguacate', color: '#0b5e43', hover: '#168054' }
      if (value.includes('berr')) return { label: 'Berries', color: '#9d2748', hover: '#bd3c61' }
      return { label: cropName, color: '#718078', hover: '#52605a' }
    }
    return {
      labels,
      datasets: cropTypes.map((cropName) => {
        const style = cropStyle(cropName)
        return { label: style.label, data: labels.map((municipalityName) => huertos.filter((huerto) => (huerto.municipio || 'Sin municipio') === municipalityName && (huerto.cultivo || 'Otro') === cropName).length), backgroundColor: style.color, hoverBackgroundColor: style.hover, borderRadius: 0, borderSkipped: false, maxBarThickness: 52 }
      }),
    }
  }, [huertos, municipalityBreakdown])
  const filtered = useMemo(() => {
    const term = normalize(query.trim())
    return huertos.filter((huerto) => {
      const matchesQuery = !term || [huerto.nombre, huerto.municipio, huerto.localidad, huerto.cultivo].some((value) => normalize(value ?? '').includes(term))
      return matchesQuery && (!crop || huerto.cultivo === crop) && (!municipality || huerto.municipio === municipality) && (!status || huerto.estado === status) && (!polygon || (polygon === 'delimitado' ? Boolean(huerto.poligono) : !huerto.poligono))
    })
  }, [crop, huertos, municipality, polygon, query, status])
  const hasFilters = Boolean(query || crop || municipality || status || polygon)
  const clearFilters = () => { setQuery(''); setCrop(''); setMunicipality(''); setStatus(''); setPolygon('') }

  return <AppLayout>
    <header className="page-header"><div><p className="eyebrow">Auditoría / Predios</p><h1>Predios registrados</h1><p>Encuentra el predio, revisa qué le falta y continúa con su evidencia o auditoría.</p></div><Link className="button" to="/auditor/huertas/nuevo">+ Registrar predio</Link></header>
    {loading && <section className="huerta-insights"><section className="huerta-summary table-loading" role="status"><span aria-hidden="true" /><p>Cargando resumen…</p></section><figure className="huerta-chart table-loading" role="status"><span aria-hidden="true" /><p>Cargando gráfica…</p></figure></section>}
    {!loading && !error && <section className="huerta-insights"><section className="huerta-summary" aria-label="Resumen de huertas"><p className="eyebrow">Resumen</p><div><b>{huertos.length}</b><span>Huertas registradas</span></div><div><b>{huertos.filter((huerto) => huerto.poligono).length}</b><span>Con polígono delimitado</span></div><div><b>{huertos.filter((huerto) => huerto.estado.toLowerCase() !== 'activo').length}</b><span>Auditorías por atender</span></div></section>{municipalityBreakdown.length > 0 && <figure className="huerta-chart huerta-chart-vertical"><figcaption><div><p className="eyebrow">Panorama territorial</p><h2>Huertas por municipio</h2></div><span>{huertos.length} registros</span></figcaption><div className="municipality-chart-canvas"><Bar aria-label="Gráfica de huertas por municipio" data={municipalityChartData} options={municipalityChartOptions} /></div></figure>}</section>}
    <section className="huerta-filters" aria-label="Buscar y filtrar predios"><label className="huerta-search"><span aria-hidden="true">⌕</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un predio, municipio o localidad" aria-label="Buscar predio, municipio o localidad" /></label><div className="huerta-filter-row"><span>Filtrar por</span><div className="huerta-filter-controls"><label>Cultivo<select value={crop} onChange={(event) => setCrop(event.target.value)}><option value="">Todos</option>{[...new Set(huertos.map((huerto) => huerto.cultivo).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Municipio<select value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option value="">Todos</option>{municipalities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Polígono<select value={polygon} onChange={(event) => setPolygon(event.target.value)}><option value="">Todos</option><option value="delimitado">Delimitado</option><option value="pendiente">Pendiente</option></select></label></div>{hasFilters && <button className="text-button clear-filters" type="button" onClick={clearFilters}>Restablecer</button>}</div></section>
    {loading && <div className="data-table table-loading" role="status"><span aria-hidden="true" /><p>Cargando huertas…</p></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && <><p className="results-count">{filtered.length} {filtered.length === 1 ? 'huerta encontrada' : 'huertas encontradas'}</p><div className="data-table"><div className="table-head"><span>Huerta</span><span>Ubicación</span><span>Superficie</span><span>Polígono</span><span>Estado</span><span /></div>{filtered.map((huerto) => <div className="table-row" key={huerto.id}><b>{huerto.nombre}<small>{huerto.cultivo}</small></b><span>{huerto.municipio}<small>{huerto.localidad}</small></span><span>{huerto.superficie_ha?.toFixed(2) ?? '—'} ha</span><span><i className={huerto.poligono ? 'status-dot is-ready' : 'status-dot'} />{huerto.poligono ? 'Delimitado' : 'Pendiente'}</span><span className={`status-chip ${huerto.estado.toLowerCase() === 'activo' ? 'is-active' : 'is-pending'}`}>{huerto.estado}</span><Link to={`/auditor/huertas/${huerto.id}`}>Ver huerta →</Link></div>)}{filtered.length === 0 && <div className="empty-state"><h2>{huertos.length === 0 ? 'Registra tu primera huerta' : 'No encontramos huertas con esos filtros'}</h2><p>{huertos.length === 0 ? 'Agrega el predio, delimita su polígono y comienza su seguimiento territorial.' : 'Prueba quitando algún filtro o realizando otra búsqueda.'}</p>{huertos.length === 0 ? <Link className="button" to="/auditor/huertas/nuevo">+ Registrar huerta</Link> : <button className="button button-secondary" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>}</div></>}
  </AppLayout>
}

export default HuertasPage
