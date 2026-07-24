import { Link, Outlet } from 'react-router-dom'

import logoUrl from '../../logo.webp'

export function AuthLayout() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-brand-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0908]" />
        <div
          className="absolute inset-0 bg-center bg-no-repeat opacity-[0.1]"
          style={{
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: 'min(72vw, 760px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_42%),linear-gradient(180deg,rgba(10,8,7,0.7),rgba(10,8,7,0.56)_24%,rgba(10,8,7,0.62)_72%,rgba(10,8,7,0.76))]" />
      </div>

      <div
        className="relative z-10 flex min-h-dvh flex-col overflow-y-auto px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: 'max(0.5rem, calc(env(safe-area-inset-top) + 0.375rem))',
          paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
        }}
      >
        <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col items-center justify-start gap-3 py-1.5 sm:justify-center sm:gap-5 sm:py-4">
          <Link
            to="/"
            aria-label="Ir al inicio de Film Locations Uruguay"
            className="inline-flex rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          >
            <img
              src={logoUrl}
              alt="Film Locations Uruguay"
              className="h-32 w-auto object-contain sm:h-36"
            />
          </Link>

          <div className="w-full max-w-[460px]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
