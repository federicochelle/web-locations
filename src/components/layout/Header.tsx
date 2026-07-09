import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, profile, role, signOut, user } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const displayName = profile?.fullName?.trim() || user?.email || null
  const panelPath = getDefaultRouteByRole(role)

  async function handleSignOut() {
    try {
      setIsSigningOut(true)
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#14110f]/88 backdrop-blur">
      <div className="page-shell flex items-center justify-between gap-4 py-4 sm:py-5">
        <NavLink
          to="/"
          className="inline-flex flex-col items-start leading-none text-brand-300 transition hover:text-brand-100"
        >
          <span className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.32em] sm:text-[0.82rem]">
            Film Locations
          </span>
          <span className="mt-1 font-display text-[0.78rem] font-semibold uppercase tracking-[0.32em] text-brand-100 sm:text-[0.82rem]">
            Uruguay
          </span>
        </NavLink>

        <div className="flex items-center gap-3">
          <NavLink
            to="/postular-locacion"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 sm:hidden"
          >
            Postular
          </NavLink>
          <NavLink
            to="/postular-locacion"
            className="hidden min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 sm:inline-flex"
          >
            Postular mi locacion
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink
                to={panelPath}
                className="hidden min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 sm:inline-flex"
              >
                Mi panel
              </NavLink>
              <p className="hidden text-sm text-brand-100/78 sm:block">{displayName}</p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? 'Cerrando...' : 'Cerrar sesion'}
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6"
              >
                Ingresar
              </NavLink>
              <NavLink
                to="/register"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-300 px-4 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
              >
                Crear cuenta
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
