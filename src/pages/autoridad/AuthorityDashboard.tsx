import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import Badge from '../../components/ui/Badge'
import { analyses, getOrchard } from '../../data/mock'

function AuthorityDashboard() {
  return <AppLayout role="autoridad"><header className="page-header"><div><p className="eyebrow">Autoridad</p><h1>Supervisión territorial</h1><p>Consulta expedientes y evidencia ambiental organizada por prioridad.</p></div><Link className="button button-quiet" to="/autoridad/expedientes">Ver expedientes</Link></header><section className="stat-grid"><div><b>36</b><span>Expedientes</span></div><div><b>8</b><span>Requieren revisión</span></div><div><b>3</b><span>Riesgo alto</span></div><div><b>1,284 ha</b><span>Superficie monitoreada</span></div></section><section className="authority-map"><div><p className="eyebrow">Territorio monitoreado</p><h2>Prioridad de revisión</h2><p>Las parcelas resaltadas son evidencia técnica; requieren valoración humana.</p></div><TerritoryMap label="Mapa territorial con huertas según riesgo" /></section><section className="section-header"><div><p className="eyebrow">Expedientes recientes</p><h2>Casos priorizados</h2></div><Link to="/autoridad/expedientes">Ver todos →</Link></section><div className="data-table"><div className="table-head"><span>Folio</span><span>Huerta</span><span>Municipio</span><span>Resultado</span><span>Riesgo</span><span /></div>{analyses.map((analysis) => { const orchard = getOrchard(analysis.orchardId); return <div className="table-row" key={analysis.id}><b>{analysis.code}</b><span>{orchard.name}</span><span>{orchard.municipality}</span><Badge value={analysis.result} /><Badge value={analysis.risk} /><Link to={`/autoridad/expedientes/${analysis.id}`}>Ver →</Link></div> })}</div></AppLayout>
}
export default AuthorityDashboard
