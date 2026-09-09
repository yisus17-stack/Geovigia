import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import TerritoryMap, { type MapOrchard } from '../../components/map/TerritoryMap'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Sin fecha disponible' : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MapsPage() {
  const [orchards, setOrchards] = useState<MapOrchard[]>([])
  const [selectedOrchard, setSelectedOrchard] = useState<MapOrchard | null>(null)
  const summary = useMemo(() => {
    const area = orchards.reduce((total, orchard) => total + (orchard.area ?? 0), 0)
    const pending = orchards.filter((orchard) => orchard.status.toLowerCase() !== 'activo').length
    const completed = orchards.length - pending
    const latest = orchards.map((orchard) => orchard.createdAt).filter(Boolean).sort().at(-1) ?? ''
    return { area, pending, completed, latest }
  }, [orchards])

  return <AppLayout>
    <header className="page-header">
      <div><p className="eyebrow">Mapas y evidencia</p><h1>Territorio monitoreado</h1><p>Consulta la ubicación de los predios registrados. Abre un predio para ver su polígono, imágenes históricas y NDVI.</p></div>
      <Link className="button button-secondary" to="/auditor/huertas">Ver predios</Link>
    </header>
    <section className="map-summary" aria-label="Resumen de seguimiento territorial">
      <article><span>Predios mostrados</span><b>{orchards.length}</b></article>
      <article><span>Superficie monitoreada</span><b>{summary.area.toFixed(2)} ha</b></article>
      <article><span>Auditorías pendientes</span><b>{summary.pending}</b></article>
      <article><span>Auditorías completadas</span><b>{summary.completed}</b></article>
      <article className="map-update"><span>Última actualización</span><b>{formatDate(summary.latest)}</b><small>Datos de registro · Imagen base actual</small></article>
    </section>
    <div className="map-workspace">
      <TerritoryMap allOrchards label="Predios registrados" onOrchardsLoaded={setOrchards} onOrchardSelect={setSelectedOrchard} />
      <aside className={`map-orchard-card ${selectedOrchard ? 'is-visible' : ''}`} aria-live="polite">
        {selectedOrchard ? <>
          <p className="eyebrow">Datos del predio</p><h2>Información registrada</h2>
          <dl><div><dt>Cultivo</dt><dd>{selectedOrchard.crop || 'Sin especificar'}</dd></div><div><dt>Municipio</dt><dd>{selectedOrchard.municipality || 'Sin especificar'}</dd></div><div><dt>Localidad</dt><dd>{selectedOrchard.locality || 'Sin especificar'}</dd></div><div><dt>Superficie</dt><dd>{selectedOrchard.area?.toFixed(2) ?? '—'} ha</dd></div><div><dt>Polígono</dt><dd>Delimitado</dd></div><div><dt>Estado</dt><dd><span className={`status-chip ${selectedOrchard.status.toLowerCase() === 'activo' ? 'is-active' : 'is-pending'}`}>{selectedOrchard.status}</span></dd></div></dl>
          <Link className="button" to={`/auditor/huertas/${selectedOrchard.id}`}>Ver detalle</Link>
        </> : <><p className="eyebrow">Consulta rápida</p><h2>Selecciona un predio</h2><p>Haz clic en un polígono para ver su ubicación, estado y evidencia disponible. Presiona una etiqueta para acercarte a él.</p></>}
      </aside>
    </div>
  </AppLayout>
}

export default MapsPage
