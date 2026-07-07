import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function PublicOnlyRoute() {
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
    return <Navigate replace to={getDefaultRouteByRole(role)} />
  }

  return <Outlet />
}
