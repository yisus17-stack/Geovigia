import AppLayout from '../../components/AppLayout'
import HuertoEditorForm from '../../components/huertos/HuertoEditorForm'

function NewOrchardPage() {
  return <AppLayout role="productor"><header className="page-header registration-header"><div><p className="eyebrow">Productor / Huertas</p><h1>Registrar huerta</h1><p>Agrega los datos del predio y delimita el terreno para guardarlo en tu cuenta.</p></div><aside><span>Paso 1 de 1</span><b>Datos y polígono</b><small>Podrás editarlo después.</small></aside></header><HuertoEditorForm /></AppLayout>
}

export default NewOrchardPage
