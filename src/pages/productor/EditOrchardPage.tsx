import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import HuertoEditorForm from '../../components/huertos/HuertoEditorForm'

export default function EditOrchardPage() {
  const { id = '' } = useParams()

  return <AppLayout role="productor">
    <header className="page-header registration-header edit-orchard-header">
      <div><p className="eyebrow">Productor / Huertas</p><h1>Editar huerta</h1><p>Actualiza la información del predio y su delimitación en el mapa.</p></div>
      <aside><small>Territorios<br />que cuentan.</small></aside>
    </header>
    <HuertoEditorForm huertoId={id} />
    <AgromichAnalysisPanel huertoId={id} />
  </AppLayout>
}
