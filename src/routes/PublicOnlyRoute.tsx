import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ProfileRecovery } from '@/components/auth/ProfileRecovery.tsx'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function PublicOnlyRoute() {
  const location = useLocation()
  const { isAuthenticated, loading, role, profile, profileState } = useAuth()
  const isEmailConfirmationLanding =
    location.pathname === '/login' &&
    new URLSearchParams(location.search).get('confirmed') === '1'

  if (loading) {
    return <AppLoading label="Cargando tu sesión..." />
  }

  if (isAuthenticated && (profileState === 'missing' || profileState === 'error')) {
    return <ProfileRecovery />
  }

  if (isAuthenticated && profile?.status !== 'active') {
    return <ProfileRecovery unavailable />
  }

  if (isEmailConfirmationLanding) {
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
