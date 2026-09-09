import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './dashboard.css'
import './typography.css'
import './responsive.css'
import './new-orchard.css'
import './clean-portal.css'
import './full-design.css'
import './color-tuning.css'
import App from './App.tsx'

registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
