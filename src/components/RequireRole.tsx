import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

type RequireRoleProps = { role: UserRole; children: ReactNode }

const isUserRole = (value: unknown): value is UserRole => value === 'productor' || value === 'auditor' || value === 'autoridad'

function RequireRole({ role, children }: RequireRoleProps) {
  const [state, setState] = useState<'loading' | 'unauthenticated' | UserRole>('loading')

  useEffect(() => {
    let isCurrent = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!isCurrent) return
      if (!data.session) {
        setState('unauthenticated')
        return
      }
      const userRole = data.session.user.user_metadata.role
      setState(isUserRole(userRole) ? userRole : 'productor')
    })
    return () => { isCurrent = false }
  }, [])

  if (state === 'loading') return <main className="loading-state">Cargando sesión…</main>
  if (state === 'unauthenticated') return <Navigate to="/login" replace />

  // Las demás vistas se pueden recorrer con la misma sesión mientras se desarrolla la demo.
  if (import.meta.env.DEV) return <>{children}</>
  if (state !== role) return <Navigate to={`/${state}`} replace />
  return <>{children}</>
}

export default RequireRole
