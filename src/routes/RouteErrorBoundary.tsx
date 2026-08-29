import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router-dom'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  const timestamp = new Date().toISOString()

  useEffect(() => {
    console.error('[route-error-boundary]', {
      error,
      pathname,
      timestamp,
    })
  }, [error, pathname, timestamp])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-brand-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0908]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_42%),linear-gradient(180deg,rgba(10,8,7,0.7),rgba(10,8,7,0.56)_24%,rgba(10,8,7,0.62)_72%,rgba(10,8,7,0.76))]" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 text-brand-950 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
              Ocurrió un problema
            </h1>
            <p className="text-sm leading-6 text-sand-700 sm:text-base">
              No pudimos cargar esta página correctamente.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Reintentar
              </button>
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 text-sm font-medium text-brand-950 transition hover:bg-sand-50"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
