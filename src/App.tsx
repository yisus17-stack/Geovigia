import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import RequireAuth from './components/RequireAuth'
import ScrollToTop from './components/ScrollToTop'
import NotFoundPage from './pages/NotFoundPage'
import AuditorDashboard from './pages/auditor/AuditorDashboard'
import MapsPage from './pages/auditor/MapsPage'
import RevisionPage from './pages/auditor/RevisionPage'
import LandingPage from './pages/LandingPage'
import HuertaDetailPage from './pages/auditor/HuertaDetailPage'
import EditHuertaPage from './pages/auditor/EditHuertaPage'
import HuertasPage from './pages/auditor/HuertasPage'
import NewHuertaPage from './pages/auditor/NewHuertaPage'
import LoginPage from './pages/LoginPage'

const auditor = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>

function App() {
  return <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auditor" element={auditor(<AuditorDashboard />)} />
      <Route path="/auditor/huertas" element={auditor(<HuertasPage />)} />
      <Route path="/auditor/huertas/nuevo" element={auditor(<NewHuertaPage />)} />
      <Route path="/auditor/huertas/:id" element={auditor(<HuertaDetailPage />)} />
      <Route path="/auditor/huertas/:id/editar" element={auditor(<EditHuertaPage />)} />
      <Route path="/auditor/mapas" element={auditor(<MapsPage />)} />
      <Route path="/auditor/auditorias/:id" element={auditor(<RevisionPage />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </>
}

export default App
