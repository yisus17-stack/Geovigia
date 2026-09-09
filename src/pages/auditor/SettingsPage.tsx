import { useState } from 'react'
import AppLayout from '../../components/AppLayout'

function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [satellite, setSatellite] = useState('Sentinel-2')

  return <AppLayout>
    <header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Configuración</h1><p>Personaliza las preferencias de tu espacio de auditoría.</p></div></header>
    <div className="settings-grid">
      <section className="settings-card"><p className="eyebrow">Cuenta</p><h2>Perfil del auditor</h2><div className="settings-profile"><span>GV</span><div><b>Auditor</b><small>Plataforma de seguimiento</small></div></div><label>Nombre para reportes<input defaultValue="Auditor" /></label><label>Correo de contacto<input type="email" placeholder="correo@ejemplo.com" /></label></section>
      <section className="settings-card"><p className="eyebrow">Evidencia</p><h2>Preferencias de análisis</h2><label>Fuente satelital preferida<select value={satellite} onChange={(event) => setSatellite(event.target.value)}><option>Sentinel-2</option><option>Landsat</option><option>Automática</option></select></label><label>Periodo de imágenes<select defaultValue="2018"><option value="2018">Desde 2018</option><option value="2020">Desde 2020</option><option value="2022">Desde 2022</option></select></label><p className="settings-hint">Fuente seleccionada: <b>{satellite}</b>.</p></section>
      <section className="settings-card settings-notifications"><p className="eyebrow">Avisos</p><h2>Notificaciones</h2><label className="settings-toggle"><span><b>Auditorías terminadas</b><small>Recibe un aviso al finalizar un expediente.</small></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /><i aria-hidden="true" /></label><label className="settings-toggle"><span><b>Resumen semanal</b><small>Conoce las huertas pendientes cada semana.</small></span><input type="checkbox" checked={weeklySummary} onChange={(event) => setWeeklySummary(event.target.checked)} /><i aria-hidden="true" /></label></section>
    </div>
  </AppLayout>
}

export default SettingsPage
