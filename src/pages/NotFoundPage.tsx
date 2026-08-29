import { Link } from 'react-router-dom'

import { usePageSeo } from '@/hooks/usePageSeo.ts'

export function NotFoundPage() {
  usePageSeo({
    title: '404',
    description: 'Página no encontrada en Film Locations Uruguay.',
    canonicalPath: '/404',
    robots: 'noindex,nofollow',
  })

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-brand-950">404</h1>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm text-brand-950 transition hover:bg-sand-50"
        >
          Ir al inicio
        </Link>
      </div>
    </section>
  )
}
