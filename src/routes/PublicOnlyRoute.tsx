import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function PublicOnlyRoute() {
  const location = useLocation()
  const { isAuthenticated, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex max-w-[1720px] justify-center">
          <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
            <p className="text-sm text-sand-700">Cargando tu sesion...</p>
          </section>
        </div>
      </div>
    )
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
