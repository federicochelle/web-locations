import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import type { UserRole } from '@/types/auth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, loading, profile, role } = useAuth()

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

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  if (!profile) {
    return (
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex max-w-[1720px] justify-center">
          <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                No pudimos cargar tu perfil
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Tu sesion esta activa, pero no encontramos el perfil asociado para continuar.
              </p>
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (profile.status !== 'active') {
    return (
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex max-w-[1720px] justify-center">
          <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Acceso no disponible
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Tu cuenta existe, pero su estado actual no permite ingresar a las rutas privadas.
              </p>
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate replace to={getDefaultRouteByRole(role)} />
  }

  return <Outlet />
}
