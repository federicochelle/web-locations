import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { UserMenu } from '@/components/layout/UserMenu.tsx'
import logoUrl from '../../../logo.webp'

export function Header() {
  const location = useLocation()
  const { isAuthenticated, loading, profile, user } = useAuth()
  const displayName = profile?.fullName?.trim() || user?.email || null
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `font-display inline-flex min-h-11 items-center justify-center border-b-2 px-1 text-base font-semibold tracking-[-0.02em] transition ${
      isActive
        ? 'border-brand-300 text-brand-100'
        : 'border-transparent text-brand-300 hover:text-brand-100'
    }`

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#14110f]/84 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex items-center">
          <NavLink
            to="/"
            className="inline-flex items-center transition hover:opacity-90"
          >
            <img
              src={logoUrl}
              alt="Film Locations Uruguay"
              className="h-14 w-auto object-contain sm:h-16"
            />
          </NavLink>
        </div>

        <nav className="hidden justify-center md:flex">
          <div className="flex items-center gap-7 lg:gap-9">
            <NavLink to="/" end className={navLinkClassName}>
              Inicio
            </NavLink>
            <NavLink to="/postular-locacion" className={navLinkClassName}>
              Publicá tu locación
            </NavLink>
            <span
              className="font-display inline-flex min-h-11 items-center justify-center border-b-2 border-transparent px-1 text-base font-semibold tracking-[-0.02em] text-brand-300 transition"
              aria-disabled="true"
            >
              Nosotros
            </span>
          </div>
        </nav>

        <div className="flex items-center justify-end gap-3.5">
          <div className="flex justify-center md:hidden">
            <NavLink
              to="/postular-locacion"
              className={navLinkClassName}
            >
              Publicá
            </NavLink>
          </div>
          {loading ? null : isAuthenticated && displayName ? (
            <UserMenu displayName={displayName} />
          ) : (
            <>
              <NavLink
                to="/login"
                state={{ from: location }}
                className={navLinkClassName}
              >
                Ingresar
              </NavLink>
              <NavLink
                to="/register"
                state={{ from: location }}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-300 px-4.5 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
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
