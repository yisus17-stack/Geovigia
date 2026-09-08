import { Link, useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import Badge from '../../components/ui/Badge'
import { analyses, getOrchard } from '../../data/mock'

function OrchardDetailPage() {
  const orchard = getOrchard(useParams().id ?? '')
  const analysis = analyses.find((item) => item.orchardId === orchard.id)
  return <AppLayout role="productor"><header className="page-header"><div><p className="eyebrow">{orchard.crop} · {orchard.municipality}</p><h1>{orchard.name}</h1><p>{orchard.locality}, Michoacán · {orchard.hectares} ha</p></div><Badge value={orchard.result} /></header>
    <TerritoryMap label={`Mapa de ${orchard.name}`} />
    <section className="section-header"><div><p className="eyebrow">Último análisis ambiental</p><h2>{analysis?.code}</h2></div>{analysis && <Link className="button" to={`/analisis/${analysis.id}`}>Ver análisis completo →</Link>}</section>
    {analysis && <div className="metric-grid"><article><span>Resultado</span><Badge value={analysis.result} /></article><article><span>Nivel de riesgo</span><b>{analysis.risk}</b></article><article><span>Confianza</span><b>{analysis.confidence}%</b></article><article><span>Área con cambio</span><b>{analysis.affectedHectares} ha</b></article><article><span>Periodo</span><b>{analysis.period}</b></article></div>}
    <section className="split-section"><div><p className="eyebrow">Historial</p><h2>Análisis anteriores</h2><p>Se mostrarán los análisis disponibles para esta huerta.</p></div><div><p className="eyebrow">Documentos</p><h2>Expediente documental</h2><button className="button button-quiet">Subir documento</button></div></section>
  </AppLayout>
}
export default OrchardDetailPage
