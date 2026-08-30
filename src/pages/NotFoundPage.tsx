import { Link } from 'react-router-dom'

import { usePageSeo } from '@/hooks/usePageSeo.ts'
import logoUrl from '../../logo.webp'

export function NotFoundPage() {
  usePageSeo({
    title: '404',
    description: 'Página no encontrada en Film Locations Uruguay.',
    canonicalPath: '/404',
    robots: 'noindex,nofollow',
  })

  return (
    <section className="w-full text-brand-100">
      <div
        className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-[1720px] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[calc(100dvh-10rem)] sm:px-6 lg:px-8"
        style={{
          paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.75rem))',
          paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))',
        }}
      >
        <div className="w-full max-w-[460px]">
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

          <div className="mt-6 space-y-4">
            <p className="font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-6xl">
              404
            </p>
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100">
              Página no encontrada
            </h1>
            <p className="text-sm leading-6 text-brand-100/68 sm:text-base">
              La página que estás buscando no existe, fue movida o ya no está disponible.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
