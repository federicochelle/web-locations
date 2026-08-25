import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function PublicOnlyRoute() {
  const location = useLocation()
  const { isAuthenticated, loading, role } = useAuth()

  if (loading) {
    return <Outlet />
  }

  if (isAuthenticated) {
    const state = location.state
    const returnTo =
      typeof state === 'object' &&
      state &&
      'from' in state &&
      state.from &&
      typeof state.from === 'object' &&
      'pathname' in state.from &&
      typeof state.from.pathname === 'string'
        ? `${state.from.pathname}${typeof state.from.search === 'string' ? state.from.search : ''}${typeof state.from.hash === 'string' ? state.from.hash : ''}`
        : null

    return <Navigate replace to={returnTo ?? getDefaultRouteByRole(role)} />
  }

  return <Outlet />
}
