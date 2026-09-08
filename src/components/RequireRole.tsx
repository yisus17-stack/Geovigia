import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type RequireRoleProps = { children: ReactNode }

function RequireRole({ children }: RequireRoleProps) {
  const [state, setState] = useState<'loading' | 'unauthenticated' | 'auditor'>('loading')

  useEffect(() => {
    let isCurrent = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!isCurrent) return
      if (!data.session) {
        setState('unauthenticated')
        return
      }
      setState('auditor')
    })
    return () => { isCurrent = false }
  }, [])

  if (state === 'loading') return <main className="loading-state">Cargando sesión…</main>
  if (state === 'unauthenticated') return <Navigate to="/login" replace />

  // Las demás vistas se pueden recorrer con la misma sesión mientras se desarrolla la demo.
  return <>{children}</>
}

export default RequireRole
