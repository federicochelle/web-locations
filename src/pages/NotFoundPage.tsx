import { Link } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function NotFoundPage() {
  usePageTitle('404')

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
