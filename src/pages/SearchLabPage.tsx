import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import { useAlgoliaLocationSearch } from '@/features/search/algolia/useAlgoliaLocationSearch.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

function parsePageParam(value: string | null) {
  const parsedValue = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1
}

export function SearchLabPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q')?.trim() ?? ''
  const initialPage = parsePageParam(searchParams.get('page'))
  const currentSearchParams = searchParams.toString()

  const {
    error,
    hits,
    loading,
    nextPage,
    page,
    previousPage,
    query,
    searchTimeMs,
    setQuery,
    totalPages,
  } = useAlgoliaLocationSearch({
    initialPage,
    initialQuery,
  })

  const resultLabel = useMemo(() => {
    if (loading) {
      return 'Consultando Algolia...'
    }

    if (error) {
      return 'La búsqueda experimental devolvió un error.'
    }

    if (hits.length === 0) {
      return 'Sin resultados para la búsqueda actual.'
    }

    return `${hits.length} resultados en esta página${searchTimeMs !== null ? ` · ${searchTimeMs} ms` : ''}`
  }, [error, hits.length, loading, searchTimeMs])

  usePageTitle('Search Lab')

  useEffect(() => {
    const nextSearchParams = new URLSearchParams()

    if (query.trim()) {
      nextSearchParams.set('q', query.trim())
    }

    if (page > 1) {
      nextSearchParams.set('page', String(page))
    }

    const nextSearchParamsString = nextSearchParams.toString()

    if (currentSearchParams !== nextSearchParamsString) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [currentSearchParams, page, query, setSearchParams])

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
      <div className="mx-auto max-w-[1720px] space-y-8 px-4 pb-16 pt-8 sm:space-y-10 sm:px-6 sm:pb-20 sm:pt-10 lg:space-y-12 lg:px-10 lg:pb-24 lg:pt-12 2xl:px-14">
        <section className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full border border-brand-300/30 bg-brand-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">
            Experimental
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
              Search Lab
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Esta ruta prueba búsqueda pública con Algolia sin tocar el buscador productivo.
            </p>
          </div>
        </section>

        <section className="max-w-5xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#14110f] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.18)] sm:p-5">
            <label
              htmlFor="search-lab-query"
              className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300"
            >
              Búsqueda
            </label>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                id="search-lab-query"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                placeholder="Buscar por código, categoría, departamento o features..."
                className="min-h-14 flex-1 rounded-full border border-white/10 bg-white/6 px-5 text-base text-brand-100 outline-none transition placeholder:text-brand-100/38 focus:border-brand-300"
              />
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-brand-100/72">
                {resultLabel}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="w-full">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[16/13] animate-pulse rounded-[0.3rem] bg-sand-200/80 lg:aspect-[16/12]"
                />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-3xl border border-red-400/25 bg-red-500/10 p-8 text-red-100 shadow-sm">
            <h2 className="text-lg font-semibold">No se pudo consultar Algolia</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : null}

        {!loading && !error && hits.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-[#14110f] p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-100">Sin resultados</h2>
            <p className="mt-2 text-sm text-brand-100/68">
              No encontramos locaciones en el índice experimental para esta búsqueda.
            </p>
          </section>
        ) : null}

        {!loading && !error && hits.length > 0 ? (
          <>
            <LocationsGrid locations={hits} />

            <section className="rounded-[1.5rem] border border-white/10 bg-[#14110f] p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-brand-100/68">
                  Página {page}
                  {totalPages > 0 ? ` de ${totalPages}` : ''}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      previousPage()
                    }}
                    disabled={page <= 1}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      nextPage()
                    }}
                    disabled={totalPages > 0 ? page >= totalPages : false}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
