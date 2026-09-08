import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import landingImage from '../../assets/landing.png'
import { supabase } from '../../lib/supabase'
import type { UserRole } from '../../types'

const isUserRole = (value: unknown): value is UserRole => value === 'productor' || value === 'auditor' || value === 'autoridad'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setStatus(''); setIsSubmitting(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError('No fue posible iniciar sesión. Verifica tus credenciales.') ; setIsSubmitting(false); return }
    const metadataRole = data.user?.user_metadata.role
    const role = isUserRole(metadataRole) ? metadataRole : 'productor'
    setStatus('Inicio exitoso. Redirigiendo…')
    window.setTimeout(() => navigate(`/${role}`), 450)
  }
  return <main className="login-page"><section className="login-visual"><Link to="/" className="brand">GeoVigía</Link><img src={landingImage} alt="Territorio agrícola observado por satélite" /><p>La evidencia territorial comienza con una mirada más clara.</p></section><section className="login-panel" aria-labelledby="login-title"><Link className="back-link" to="/">← Volver al inicio</Link><p className="eyebrow">Acceso a plataforma</p><h1 id="login-title">Bienvenido.</h1><p className="login-intro">Ingresa para consultar tus huertas, revisiones o expedientes.</p><form className="login-form" onSubmit={handleSubmit}><label htmlFor="email">Correo electrónico</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error && <p className="form-error" role="alert">{error}</p>}{status && <p className="success-message" role="status">{status}</p>}<button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Ingresando…' : 'Iniciar sesión →'}</button></form><p className="login-help">¿Olvidaste tu contraseña? Solicita apoyo al responsable de tu organización.</p></section></main>
}
export default LoginPage
