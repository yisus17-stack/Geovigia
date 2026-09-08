import AppLayout from '../components/AppLayout'
import TerritoryMap from '../components/map/TerritoryMap'
import Badge from '../components/ui/Badge'
import { getAnalysis, getOrchard } from '../data/mock'
import { useParams } from 'react-router-dom'

function AnalysisPage() {
  const analysis = getAnalysis(useParams().id ?? '')
  const orchard = getOrchard(analysis.orchardId)
  return <AppLayout role="productor"><header className="page-header audit-header"><div><p className="eyebrow">Análisis ambiental</p><h1>{analysis.code}</h1><p>{orchard.name} · {analysis.period} · {analysis.date}</p></div><div><Badge value={analysis.result} /><p className="risk-label">Riesgo <b>{analysis.risk}</b> · Confianza <b>{analysis.confidence}%</b></p></div></header>
    <section className="analysis-intro"><p>Se detectó una variación de cobertura en una zona del predio. El resultado requiere revisión humana antes de cualquier determinación.</p></section>
    <TerritoryMap label="Cambios ambientales detectados" />
    <section className="analysis-section"><p className="eyebrow">Cambio ambiental</p><div className="metric-grid"><article><span>Superficie afectada</span><b>{analysis.affectedHectares} ha</b></article><article><span>Porcentaje del predio</span><b>{analysis.changePercent}%</b></article><article><span>Cobertura inicial</span><b>Vegetación densa</b></article><article><span>Cobertura final</span><b>Área intervenida</b></article></div></section>
    <section className="two-column"><div><p className="eyebrow">Hallazgos</p><h2>Evidencia a revisar</h2><article className="finding"><Badge value="Alto" /><h3>Pérdida significativa de cobertura</h3><p>Se identificó una diferencia persistente entre periodos satelitales.</p></article><article className="finding"><Badge value="Requiere revisión" /><h3>Posible cambio de uso de suelo</h3><p>La interpretación debe contrastarse con documentación y revisión humana.</p></article></div><div><p className="eyebrow">Evidencia satelital</p><h2>Fuentes utilizadas</h2><dl className="evidence-list"><div><dt>Satélite</dt><dd>Sentinel‑2</dd></div><div><dt>Fecha</dt><dd>08 feb 2026</dd></div><div><dt>Nubosidad</dt><dd>8%</dd></div><div><dt>Resolución</dt><dd>10 m</dd></div></dl></div></section>
    <section className="criteria"><p className="eyebrow">Criterios normativos</p><h2>Resultado técnico de referencia</h2><div><span>Cobertura vegetal en el periodo</span><Badge value="Requiere revisión" /></div><div><span>Documentación territorial</span><Badge value="Información insuficiente" /></div><p className="technical-note">Los resultados constituyen un análisis técnico de apoyo basado en información geoespacial y criterios ambientales de referencia. No sustituyen una inspección, autorización, certificación o resolución emitida por la autoridad competente.</p></section>
  </AppLayout>
}
export default AnalysisPage
