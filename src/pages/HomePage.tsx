import { useEffect, useState } from 'react'

import { HomeAboutBenefitsSection } from '@/features/home/components/HomeAboutBenefitsSection.tsx'
import { HomeAboutSection } from '@/features/home/components/HomeAboutSection.tsx'
import { HomeCategoriesGrid } from '@/features/home/components/HomeCategoriesGrid.tsx'
import { HomePublishLocationSection } from '@/features/home/components/HomePublishLocationSection.tsx'
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
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
      <HomeSearchSection
        categories={categories}
        features={features}
        isLoading={isLoading}
        error={error}
      />

      <div className="mx-auto max-w-[1720px] space-y-12 px-4 pt-12 sm:space-y-14 sm:px-6 sm:pt-14 lg:space-y-18 lg:px-10 lg:pt-16 2xl:px-14">
        {isLoading ? (
          <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[5/6] animate-pulse rounded-[0.3rem] bg-white/8 sm:aspect-[6/5] xl:aspect-[4/5]"
                />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-[2rem] border border-red-200/20 bg-red-50 px-6 py-8 text-red-900 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
            <h2 className="text-lg font-semibold">No se pudieron cargar las categorias</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : null}

        {!isLoading && !error && categories.length === 0 ? (
          <section className="rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
            <h2 className="text-lg font-semibold text-brand-950">No hay categorias</h2>
            <p className="mt-2 text-sm text-sand-700">
              Cuando existan categorias en Supabase, apareceran aqui.
            </p>
          </section>
        ) : null}

        {!isLoading && !error && categories.length > 0 ? (
          <section id="explorar">
            <HomeCategoriesGrid
              categories={buildHomeCategoryCards(categories)}
            />
          </section>
        ) : null}

        <HomeAboutSection />
        <HomeAboutBenefitsSection />
        <HomePublishLocationSection />
      </div>
    </div>
  )
}
