import { Link, matchPath, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import logoUrl from '../../../logo.webp'

type MobileNavigationItem = {
  label: string
  to: string
  Icon: (props: { className?: string }) => React.JSX.Element
  matches: (pathname: string) => boolean
  usesLogo?: boolean
}

function ProjectsIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 7.5A1.75 1.75 0 0 1 5.5 5.75h4l1.5 1.75h7.5a1.75 1.75 0 0 1 1.75 1.75v8.25a1.75 1.75 0 0 1-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75V7.5Z" />
      <path d="M3.75 9.25h16.5" />
    </svg>
  )
}

function FavoritesIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19.5 5.9 13.4a4.4 4.4 0 0 1 6.22-6.22L12 8.3l-.12-.12a4.4 4.4 0 0 1 6.22 6.22Z" />
    </svg>
  )
}

function AccountIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19.25a6.25 6.25 0 0 1 12.5 0" />
    </svg>
  )
}

const mobileNavigationItems: MobileNavigationItem[] = [
  {
    label: 'Inicio',
    to: '/',
    Icon: ProjectsIcon,
    usesLogo: true,
    matches: (pathname) =>
      pathname === '/' ||
      pathname === '/busqueda' ||
      matchPath('/categorias/:slug', pathname) !== null ||
      matchPath('/categorias/:categorySlug/:locationCode', pathname) !== null ||
      matchPath('/locations/:slug', pathname) !== null,
  },
  {
    label: 'Proyectos',
    to: '/requests',
    Icon: ProjectsIcon,
    matches: (pathname) => matchPath('/requests/*', pathname) !== null,
  },
  {
    label: 'Favoritos',
    to: '/favorites',
    Icon: FavoritesIcon,
    matches: (pathname) => matchPath('/favorites', pathname) !== null,
  },
  {
    label: 'Cuenta',
    to: '/profile',
    Icon: AccountIcon,
    matches: (pathname) =>
      pathname === '/profile' ||
      pathname === '/dashboard' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password',
  },
]

const hiddenNavigationPatterns = ['/admin/*', '/404']

export function MobileBottomNavigation() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()
  const shouldHideNavigation = hiddenNavigationPatterns.some(
    (pattern) => matchPath(pattern, location.pathname) !== null,
  )
  const accountDestination = loading
    ? location.pathname
    : isAuthenticated
      ? '/profile'
      : '/login'

  if (shouldHideNavigation) {
    return null
  }

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#14110f]/96 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm md:hidden"
    >
      <div
        className="grid grid-cols-4 items-stretch px-0.5 pt-0"
        style={{
          paddingBottom: 'calc(0.2rem + env(safe-area-inset-bottom))',
        }}
      >
        {mobileNavigationItems.map(({ label, to, Icon, matches, usesLogo }) => {
          const isActive = matches(location.pathname)
          const destination = label === 'Cuenta' ? accountDestination : to

          return (
            <Link
              key={to}
              to={destination}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => {
                if (label === 'Cuenta' && loading) {
                  event.preventDefault()
                }
              }}
              className={`group inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] ${
                isActive
                  ? 'text-brand-100'
                  : 'text-brand-300/72 hover:text-brand-100'
              }`}
            >
              {usesLogo ? (
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  className={`h-12 w-auto object-contain transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-72 group-hover:opacity-100'
                  }`}
                />
              ) : (
                <>
                  <Icon className="h-6 w-6 shrink-0" />
                  <span
                    className={`text-[11px] leading-none ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
