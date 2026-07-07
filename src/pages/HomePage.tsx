import { useEffect, useState } from 'react'

import { HomeCategoriesGrid } from '@/features/home/components/HomeCategoriesGrid.tsx'
import { HomeSearchSection } from '@/features/home/components/HomeSearchSection.tsx'
import { buildHomeCategoryCards } from '@/features/home/mocks/home.mock.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getCategories } from '@/services/categories.service.ts'
import { getFeatures } from '@/services/features.service.ts'
import type { Category, Feature } from '@/types/location.ts'

export function HomePage() {
  usePageTitle('Home')
  const [categories, setCategories] = useState<Category[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadCategories() {
      try {
        setIsLoading(true)
        setError(null)

        const nextCategories = await getCategories()

        if (!isMounted) {
          return
        }

        setCategories(nextCategories)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las categorias.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadFeatures() {
      try {
        const nextFeatures = await getFeatures()

        if (!isMounted) {
          return
        }

        setFeatures(nextFeatures)
      } catch {
        if (isMounted) {
          setFeatures([])
        }
      }
    }

    void loadFeatures()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8 sm:space-y-10">
      <HomeSearchSection
        categories={categories}
        features={features}
        isLoading={isLoading}
        error={error}
      />

      {isLoading ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[5/6] animate-pulse rounded-[1.75rem] bg-sand-200 sm:aspect-[6/5] xl:aspect-[4/5]"
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="text-lg font-semibold">No se pudieron cargar las categorias</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && categories.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-950">No hay categorias</h2>
          <p className="mt-2 text-sm text-sand-700">
            Cuando existan categorias en Supabase, apareceran aqui.
          </p>
        </section>
      ) : null}

      {!isLoading && !error && categories.length > 0 ? (
        <HomeCategoriesGrid
          categories={buildHomeCategoryCards(categories)}
        />
      ) : null}
    </div>
  )
}
