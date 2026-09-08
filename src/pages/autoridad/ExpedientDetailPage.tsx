import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'
import Badge from '../../components/ui/Badge'
import { getAnalysis, getOrchard } from '../../data/mock'

function ExpedientDetailPage() {
  const analysis = getAnalysis(useParams().id ?? '')
  const orchard = getOrchard(analysis.orchardId)
  return <AppLayout role="autoridad"><header className="page-header"><div><p className="eyebrow">Expediente ambiental</p><h1>{analysis.code}</h1><p>{orchard.name} · {orchard.municipality} · Productor: Laura Hernández</p></div><div><Badge value={analysis.result} /><p className="risk-label">Riesgo <b>{analysis.risk}</b></p></div></header><TerritoryMap label="Mapa de expediente ambiental" /><section className="two-column"><div><p className="eyebrow">Resumen técnico</p><h2>Resultado y factores relevantes</h2><p>El análisis identifica una variación en la cobertura durante el periodo observado. Es evidencia técnica de apoyo para su revisión.</p><dl className="evidence-list"><div><dt>Confianza</dt><dd>{analysis.confidence}%</dd></div><div><dt>Área con cambio</dt><dd>{analysis.affectedHectares} ha</dd></div><div><dt>Periodo</dt><dd>{analysis.period}</dd></div></dl></div><div><p className="eyebrow">Revisión del auditor</p><h2>En espera de validación</h2><Badge value="Pendiente" /><p>Se requiere contraste con documentos y, si corresponde, visita de campo.</p></div></section><section className="two-column"><div><p className="eyebrow">Documentos</p><h2>Expediente documental</h2><p>Constancia de posesión · pendiente</p><p>Identificación del predio · pendiente</p></div><div><p className="eyebrow">Recomendación</p><h2>Siguiente paso</h2><p>Solicitar información documental complementaria antes de emitir una valoración.</p><button className="button button-disabled" disabled>Descargar expediente PDF</button><small>La generación de PDF aún no está disponible.</small></div></section><p className="technical-note">Este expediente presenta evidencia técnica de apoyo. No constituye una inspección, autorización, certificación o resolución de la autoridad competente.</p></AppLayout>
}
export default ExpedientDetailPage
