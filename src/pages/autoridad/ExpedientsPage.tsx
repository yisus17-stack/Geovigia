import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Badge from '../../components/ui/Badge'
import { analyses, getOrchard } from '../../data/mock'

function ExpedientsPage() {
  return <AppLayout role="autoridad"><header className="page-header"><div><p className="eyebrow">Autoridad / Expedientes</p><h1>Expedientes ambientales</h1><p>Resultados técnicos organizados para su consulta y revisión.</p></div></header><div className="filters"><label>Municipio<select><option>Todos los municipios</option><option>Uruapan</option><option>Los Reyes</option></select></label><label>Riesgo<select><option>Todos los riesgos</option><option>Alto</option><option>Medio</option></select></label></div><div className="data-table"><div className="table-head"><span>Folio</span><span>Huerta</span><span>Municipio</span><span>Cultivo</span><span>Resultado técnico</span><span /></div>{analyses.map((analysis) => { const orchard = getOrchard(analysis.orchardId); return <div className="table-row" key={analysis.id}><b>{analysis.code}<small>{analysis.date}</small></b><span>{orchard.name}</span><span>{orchard.municipality}</span><span>{orchard.crop}</span><Badge value={analysis.result} /><Link to={`/autoridad/expedientes/${analysis.id}`}>Abrir →</Link></div> })}</div></AppLayout>
}
export default ExpedientsPage
