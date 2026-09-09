import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import AgromichAnalysisPanel from '../../components/huertos/AgromichAnalysisPanel'
import HuertoEditorForm from '../../components/huertos/HuertoEditorForm'
function EditHuertaPage() { const { id = '' } = useParams(); return <AppLayout><HuertoEditorForm huertoId={id} /><AgromichAnalysisPanel huertoId={id} /></AppLayout> }
export default EditHuertaPage
