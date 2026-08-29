import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { UserMenu } from '@/components/layout/UserMenu.tsx'
import { GOLDEN_PI_URL } from '@/utils/external-links.ts'
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
    <header className="sticky top-0 z-20">
      <div className="relative border-b border-white/10 bg-[#14110f]/84 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
        <a
          href={GOLDEN_PI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative hidden overflow-hidden bg-[#daa61a] px-4 py-0.5 text-center text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white [font-family:var(--font-lato)] transition hover:bg-[#d4a63d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0908] md:block"
        >
          <span className="relative z-10">Conocé Golden Proyectos Inmobiliarios</span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 top-[65%] bg-[linear-gradient(180deg,rgba(20,17,15,0)_0%,rgba(20,17,15,0.18)_38%,rgba(20,17,15,0.5)_100%)]"
          />
        </a>
        <div className="mx-auto grid w-full max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 lg:py-2 xl:px-10 2xl:px-12">
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
              <NavLink to="/nosotros" className={navLinkClassName}>
                Nosotros
              </NavLink>
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
      </div>
    </header>
  )
}
