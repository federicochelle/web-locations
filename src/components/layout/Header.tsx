import { NavLink } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { UserMenu } from '@/components/layout/UserMenu.tsx'
import { SelectionDrawerTrigger } from '@/components/selection/SelectionDrawerTrigger.tsx'

export function Header() {
  const { isAuthenticated, loading, profile, signOut, user } = useAuth()
  const displayName = profile?.fullName?.trim() || user?.email || null
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-10 items-center justify-center border-b-2 px-1 text-sm font-medium transition ${
      isActive
        ? 'border-brand-300 text-brand-100'
        : 'border-transparent text-brand-300 hover:text-brand-100'
    }`

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#14110f]/84 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-[1700px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 xl:px-10 2xl:px-12">
        <NavLink
          to="/"
          className="inline-flex flex-col items-start leading-none text-brand-300 transition hover:text-brand-100"
        >
          <span className="font-display text-[1.02rem] font-semibold uppercase tracking-[0.32em] sm:text-[1.08rem]">
            Film Locations
          </span>
          <span className="mt-1 font-display text-[1.02rem] font-semibold uppercase tracking-[0.32em] text-brand-100 sm:text-[1.08rem]">
            Uruguay
          </span>
        </NavLink>

        <nav className="hidden justify-center md:flex">
          <div className="flex items-center gap-7 lg:gap-9">
            <NavLink to="/" end className={navLinkClassName}>
              Explorar
            </NavLink>
            <NavLink to="/postular-locacion" className={navLinkClassName}>
              Publicá tu locación
            </NavLink>
            <span
              className="inline-flex min-h-10 items-center justify-center border-b-2 border-transparent px-1 text-sm font-medium text-brand-300 transition"
              aria-disabled="true"
            >
              Nosotros
            </span>
          </div>
        </nav>

        <div className="flex justify-center md:hidden">
          <NavLink
            to="/postular-locacion"
            className={navLinkClassName}
          >
            Publicá
          </NavLink>
        </div>

        <div className="flex items-center justify-end gap-3.5">
          <SelectionDrawerTrigger />
          {loading ? null : isAuthenticated && displayName ? (
            <UserMenu displayName={displayName} onSignOut={signOut} />
          ) : (
            <>
              <NavLink
                to="/login"
                className={navLinkClassName}
              >
                Ingresar
              </NavLink>
              <NavLink
                to="/register"
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
