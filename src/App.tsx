import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import RequireRole from './components/RequireRole'
import AnalysisPage from './pages/AnalysisPage'
import NotFoundPage from './pages/NotFoundPage'
import AuditorDashboard from './pages/auditor/AuditorDashboard'
import RevisionPage from './pages/auditor/RevisionPage'
import AuthorityDashboard from './pages/autoridad/AuthorityDashboard'
import ExpedientDetailPage from './pages/autoridad/ExpedientDetailPage'
import ExpedientsPage from './pages/autoridad/ExpedientsPage'
import LoginPage from './pages/auth/LoginPage'
import LandingPage from './pages/LandingPage'
import OrchardDetailPage from './pages/productor/OrchardDetailPage'
import EditOrchardPage from './pages/productor/EditOrchardPage'
import OrchardsPage from './pages/productor/OrchardsPage'
import NewOrchardPage from './pages/productor/NewOrchardPage'
import ProductorDashboard from './pages/productor/ProductorDashboard'

const productor = (page: ReactNode) => <RequireRole role="productor">{page}</RequireRole>
const auditor = (page: ReactNode) => <RequireRole role="auditor">{page}</RequireRole>
const autoridad = (page: ReactNode) => <RequireRole role="autoridad">{page}</RequireRole>

function App() {
  return <Routes>
    <Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} />
    <Route path="/productor" element={productor(<ProductorDashboard />)} /><Route path="/productor/huertos" element={productor(<OrchardsPage />)} /><Route path="/productor/huertos/nuevo" element={productor(<NewOrchardPage />)} /><Route path="/productor/huertos/:id/editar" element={productor(<EditOrchardPage />)} /><Route path="/productor/huertos/:id" element={productor(<OrchardDetailPage />)} /><Route path="/analisis/:id" element={productor(<AnalysisPage />)} />
    <Route path="/auditor" element={auditor(<AuditorDashboard />)} /><Route path="/auditor/revisiones/:id" element={auditor(<RevisionPage />)} />
    <Route path="/autoridad" element={autoridad(<AuthorityDashboard />)} /><Route path="/autoridad/expedientes" element={autoridad(<ExpedientsPage />)} /><Route path="/autoridad/expedientes/:id" element={autoridad(<ExpedientDetailPage />)} />
    <Route path="/dashboard" element={<Navigate to="/productor" replace />} /><Route path="*" element={<NotFoundPage />} />
  </Routes>
}
export default App
