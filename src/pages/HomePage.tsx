import { useEffect, useState } from 'react'

import { HomeAboutBenefitsSection } from '@/features/home/components/HomeAboutBenefitsSection.tsx'
import { HomeAboutSection } from '@/features/home/components/HomeAboutSection.tsx'
import { HomeCategoriesGrid } from '@/features/home/components/HomeCategoriesGrid.tsx'
import { HomePublishLocationSection } from '@/features/home/components/HomePublishLocationSection.tsx'
import { HomeSearchSection } from '@/features/home/components/HomeSearchSection.tsx'
import { buildHomeCategoryCards } from '@/features/home/mocks/home.mock.ts'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getCategories } from '@/services/categories.service.ts'
import type { Category } from '@/types/location.ts'

const CRITICAL_IMAGE_TIMEOUT_MS = 2000

function getCriticalImageCount(totalImages: number) {
  const maxCriticalImages =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4

  return Math.min(totalImages, maxCriticalImages)
}

export function HomePage() {
  usePageTitle('Home')
  const [categories, setCategories] = useState<Category[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [resolvedCriticalImagesCount, setResolvedCriticalImagesCount] = useState(0)
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const categoryCards = buildHomeCategoryCards(categories)
  const criticalImageCount = getCriticalImageCount(categoryCards.length)

  useEffect(() => {
    let isMounted = true

    async function loadCategories() {
      try {
        setIsDataLoading(true)
        setError(null)
        setResolvedCriticalImagesCount(0)
        setIsWaitingForCriticalImages(false)

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
          setIsDataLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (isDataLoading || error || categoryCards.length === 0 || criticalImageCount === 0) {
      setIsWaitingForCriticalImages(false)
      return
    }

    if (resolvedCriticalImagesCount >= criticalImageCount) {
      setIsWaitingForCriticalImages(false)
      return
    }

    setIsWaitingForCriticalImages(true)

    const timeoutId = window.setTimeout(() => {
      setIsWaitingForCriticalImages(false)
    }, CRITICAL_IMAGE_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    categoryCards.length,
    criticalImageCount,
    error,
    isDataLoading,
    resolvedCriticalImagesCount,
  ])

  const isLoading = isDataLoading || isWaitingForCriticalImages

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
      <HomeSearchSection />

      <div className="mx-auto max-w-[1720px] space-y-12 px-4 pt-12 sm:space-y-14 sm:px-6 sm:pt-14 lg:space-y-18 lg:px-10 lg:pt-16 2xl:px-14">
        {isLoading ? (
          <section id="explorar">
            <AppLoading label="Cargando categorías..." />
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

        {!isDataLoading && !error && categoryCards.length > 0 ? (
          <section
            id="explorar"
            className={
              isWaitingForCriticalImages
                ? 'pointer-events-none invisible max-h-0 overflow-hidden'
                : ''
            }
            aria-hidden={isWaitingForCriticalImages}
          >
            <HomeCategoriesGrid
              categories={categoryCards}
              onCriticalImageSettled={() => {
                setResolvedCriticalImagesCount((currentCount) => currentCount + 1)
              }}
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
