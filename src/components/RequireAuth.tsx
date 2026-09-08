import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function RequireAuth({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthenticated(Boolean(data.session))
      setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthenticated(Boolean(session))
      setChecking(false)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  if (checking) return <main className="auth-loading">Comprobando acceso…</main>
  return authenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default RequireAuth
