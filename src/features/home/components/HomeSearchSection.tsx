import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HeroBackgroundMosaic } from '@/features/home/components/HeroBackgroundMosaic.tsx'
import type { Category, Feature } from '@/types/location.ts'

type HomeSearchSectionProps = {
  categories: Category[]
  features: Feature[]
  isLoading: boolean
  error: string | null
}

type DetectedFeatureMatch = {
  slug: string
  matchedCandidates: string[]
}

const SEARCH_STOPWORDS = new Set([
  'con',
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'y',
  'en',
  'para',
  'por',
])

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasFeatureMatch(text: string, candidate: string) {
  if (!candidate) {
    return false
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(candidate)}([^a-z0-9]|$)`)
  return pattern.test(text)
}

function getNormalizedFeatureCandidates(feature: Feature) {
  return [...new Set([
    normalizeSearchValue(feature.slug),
    normalizeSearchValue(feature.slug).replaceAll('-', ' '),
    normalizeSearchValue(feature.name),
    ...(feature.aliases ?? []).map((alias) => normalizeSearchValue(alias)),
  ].filter((candidate) => candidate.length > 0))]
}

function detectFeatureMatches(
  searchText: string,
  features: Feature[],
): DetectedFeatureMatch[] {
  const normalizedText = normalizeSearchValue(searchText)

  if (!normalizedText) {
    return []
  }

  return features
    .map((feature) => {
      const matchedCandidates = getNormalizedFeatureCandidates(feature).filter(
        (candidate) => hasFeatureMatch(normalizedText, candidate),
      )

      if (matchedCandidates.length === 0) {
        return null
      }

      return {
        slug: feature.slug,
        matchedCandidates,
      } satisfies DetectedFeatureMatch
    })
    .filter((featureMatch): featureMatch is DetectedFeatureMatch => Boolean(featureMatch))
}

function buildCleanSearchQuery(
  searchText: string,
  featureMatches: DetectedFeatureMatch[],
) {
  let normalizedText = normalizeSearchValue(searchText)

  const matchedCandidates = [...new Set(
    featureMatches.flatMap((featureMatch) => featureMatch.matchedCandidates),
  )].sort((left, right) => right.length - left.length)

  for (const candidate of matchedCandidates) {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(candidate)}([^a-z0-9]|$)`,
      'g',
    )

    normalizedText = normalizedText.replace(pattern, ' ')
  }

  return normalizedText
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !SEARCH_STOPWORDS.has(token))
    .join(' ')
}

export function HomeSearchSection({
  categories,
  features,
  isLoading,
  error,
}: HomeSearchSectionProps) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('')

  useEffect(() => {
    if (!selectedCategorySlug) {
      return
    }

    const categoryStillExists = categories.some(
      (category) => category.slug === selectedCategorySlug,
    )

    if (!categoryStillExists) {
      setSelectedCategorySlug('')
    }
  }, [categories, selectedCategorySlug])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedSearchText = searchText.trim()
    const nextSearchParams = new URLSearchParams()

    if (selectedCategorySlug) {
      nextSearchParams.set('category', selectedCategorySlug)
    }

    const detectedFeatureMatches = detectFeatureMatches(trimmedSearchText, features)
    const detectedFeatureSlugs = detectedFeatureMatches.map(
      (featureMatch) => featureMatch.slug,
    )

    if (detectedFeatureSlugs.length > 0) {
      const cleanSearchQuery = buildCleanSearchQuery(
        trimmedSearchText,
        detectedFeatureMatches,
      )

      if (cleanSearchQuery) {
        nextSearchParams.set('q', cleanSearchQuery)
      }
    } else if (trimmedSearchText) {
      nextSearchParams.set('q', trimmedSearchText)
    }

    if (detectedFeatureSlugs.length > 0) {
      nextSearchParams.set('features', detectedFeatureSlugs.join(','))
    }

    const nextQueryString = nextSearchParams.toString()

    navigate(nextQueryString ? `/locations?${nextQueryString}` : '/locations')
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-transparent">
      <div className="relative flex min-h-[560px] items-center px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[620px] lg:px-10 lg:py-12 2xl:px-14">
        <HeroBackgroundMosaic />

        <div className="relative mx-auto flex w-full max-w-[1720px] justify-center">
          <div className="w-full max-w-5xl space-y-8 text-center lg:space-y-10">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Encontrá la locación perfecta para tu próxima producción.
                </h1>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto grid w-full max-w-5xl gap-3 rounded-[1.6rem] bg-black/76 p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[10px] sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:gap-4 lg:rounded-[1.8rem] lg:p-5"
            >
              <label className="space-y-2">
                <span className="block px-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-brand-300/90 sm:text-[0.72rem]">
                  Describe tu locación
                </span>
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Ingresa tu texto aqui..."
                  className="min-h-16 w-full rounded-[1.25rem] bg-white/4 px-5 text-sm text-brand-300 outline-none transition duration-200 placeholder:text-brand-100/42 focus:bg-white/6 focus:shadow-[0_0_0_4px_rgba(215,192,162,0.1)] sm:text-[0.95rem]"
                />
              </label>

              <label className="space-y-2">
                <span className="block px-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-brand-300/90 sm:text-[0.72rem]">
                  Buscar por categoria
                </span>
                <select
                  value={selectedCategorySlug}
                  onChange={(event) => setSelectedCategorySlug(event.target.value)}
                  disabled={isLoading || categories.length === 0}
                  className="min-h-16 w-full rounded-[1.25rem] bg-white/4 px-5 text-sm text-brand-300 outline-none transition duration-200 focus:bg-white/6 focus:shadow-[0_0_0_4px_rgba(215,192,162,0.1)] disabled:cursor-not-allowed disabled:bg-white/4 disabled:text-brand-100/40 sm:text-[0.95rem]"
                >
                  <option value="">
                    {isLoading
                      ? 'Cargando categorias...'
                      : categories.length > 0
                      ? 'Todas las categorias'
                      : 'No hay categorias disponibles'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="min-h-16 self-end rounded-[1.25rem] bg-brand-300 px-8 text-sm font-semibold text-brand-950 shadow-[0_16px_34px_rgba(155,120,88,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-100 hover:shadow-[0_20px_38px_rgba(155,120,88,0.28)] sm:px-9 sm:text-[0.95rem]"
              >
                Buscar
              </button>
            </form>

            {error ? (
              <p className="mx-auto max-w-3xl px-1 text-center text-sm text-brand-100/82">
                No pudimos cargar las categorias para el selector. Igual puedes explorar
                todas las locaciones.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
