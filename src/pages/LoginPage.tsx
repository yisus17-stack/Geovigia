import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo_blanco.png'
import { supabase } from '../lib/supabase'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/auditor', { replace: true }) })
  }, [navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.')
      setLoading(false)
      return
    }
    navigate('/auditor', { replace: true })
  }

  return <main className="login-page">
    <section className="login-visual"><Link className="brand" to="/" aria-label="GeoVigía, inicio"><img src={logoImage} alt="GeoVigía" /></Link><p>Auditoría territorial con evidencia clara y trazable.</p></section>
    <section className="login-panel"><Link className="back-link" to="/">← Volver al inicio</Link><p className="eyebrow">Acceso de Auditor</p><h1>Iniciar sesión</h1><p className="login-intro">Ingresa con las credenciales autorizadas para administrar huertas y auditorías.</p><form className="login-form" onSubmit={(event) => { void submit(event) }}><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={loading}>{loading ? 'Ingresando…' : 'Entrar como Auditor'}</button></form></section>
  </main>
}

export default LoginPage
