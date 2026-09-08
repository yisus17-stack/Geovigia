import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import TerritoryMap from '../../components/map/TerritoryMap'

function MapsPage() {
  return <AppLayout>
    <header className="page-header">
      <div><p className="eyebrow">Mapas y evidencia</p><h1>Territorio monitoreado</h1><p>Consulta la ubicación de las huertas registradas. Abre una huerta para ver su polígono, imágenes históricas y NDVI.</p></div>
      <Link className="button button-secondary" to="/auditor/huertas">Ver huertas</Link>
    </header>
    <TerritoryMap allOrchards label="Huertas registradas" />
  </AppLayout>
}

export default MapsPage
