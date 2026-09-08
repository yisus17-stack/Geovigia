import AppLayout from '../../components/AppLayout'
import HuertoEditorForm from '../../components/huertos/HuertoEditorForm'
function NewHuertaPage() { return <AppLayout><header className="page-header registration-header"><div><p className="eyebrow">Auditoría / Huertas</p><h1>Registrar huerta</h1><p>Agrega los datos del predio y delimita el terreno para incorporarlo al seguimiento.</p></div><aside><span>Paso 1 de 1</span><b>Datos y polígono</b><small>Podrás editarlo después.</small></aside></header><HuertoEditorForm /></AppLayout> }
export default NewHuertaPage
