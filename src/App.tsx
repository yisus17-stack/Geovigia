import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import RequireRole from './components/RequireRole'
import ScrollToTop from './components/ScrollToTop'
import NotFoundPage from './pages/NotFoundPage'
import AuditorDashboard from './pages/auditor/AuditorDashboard'
import AuditorOrchardsPage from './pages/auditor/OrchardsPage'
import NewAuditorOrchardPage from './pages/auditor/NewOrchardPage'
import EditAuditorOrchardPage from './pages/auditor/EditOrchardPage'
import AuditorOrchardDetailPage from './pages/auditor/RevisionPage'
import LoginPage from './pages/auth/LoginPage'
import LandingPage from './pages/LandingPage'

const auditor = (page: ReactNode) => <RequireRole>{page}</RequireRole>

function App() {
  return <><ScrollToTop /><Routes>
    <Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} />
    <Route path="/auditor" element={auditor(<AuditorDashboard />)} />
    <Route path="/auditor/huertas" element={auditor(<AuditorOrchardsPage />)} />
    <Route path="/auditor/huertas/nuevo" element={auditor(<NewAuditorOrchardPage />)} />
    <Route path="/auditor/huertas/:id/editar" element={auditor(<EditAuditorOrchardPage />)} />
    <Route path="/auditor/huertas/:id" element={auditor(<AuditorOrchardDetailPage />)} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></>
}
export default App
