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

type DetectedCategoryMatch = {
  slug: string
  matchedCandidate: string
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
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
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

function getSingularCandidate(candidate: string) {
  if (candidate.endsWith('es') && candidate.length > 4) {
    return candidate.slice(0, -2)
  }

  if (candidate.endsWith('s') && candidate.length > 3) {
    return candidate.slice(0, -1)
  }

  return ''
}

function getNormalizedCategoryCandidates(category: Category) {
  const baseCandidates = [
    normalizeSearchValue(category.name),
    normalizeSearchValue(category.slug),
    normalizeSearchValue(category.slug.replaceAll('-', ' ')),
  ].filter((candidate) => candidate.length > 0)

  return [...new Set([
    ...baseCandidates,
    ...baseCandidates.map((candidate) => getSingularCandidate(candidate)),
  ].filter((candidate) => candidate.length > 0))]
}

function detectCategoryMatch(
  searchText: string,
  categories: Category[],
): DetectedCategoryMatch | null {
  const normalizedText = normalizeSearchValue(searchText)

  if (!normalizedText) {
    return null
  }

  const matches = categories
    .flatMap((category) =>
      getNormalizedCategoryCandidates(category)
        .filter((candidate) => hasFeatureMatch(normalizedText, candidate))
        .map((candidate) => ({
          slug: category.slug,
          matchedCandidate: candidate,
          matchIndex: normalizedText.indexOf(candidate),
        })),
    )
    .sort((left, right) => {
      if (left.matchIndex !== right.matchIndex) {
        return left.matchIndex - right.matchIndex
      }

      return right.matchedCandidate.length - left.matchedCandidate.length
    })

  return matches[0] ?? null
}

function buildCleanSearchQuery(
  searchText: string,
  removableCandidates: string[],
) {
  let normalizedText = normalizeSearchValue(searchText)

  const matchedCandidates = [...new Set(removableCandidates)]
    .filter((candidate) => candidate.length > 0)
    .sort((left, right) => right.length - left.length)

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
    const detectedCategoryMatch = selectedCategorySlug
      ? null
      : detectCategoryMatch(trimmedSearchText, categories)
    const nextCategorySlug = selectedCategorySlug || detectedCategoryMatch?.slug || ''

    const detectedFeatureMatches = detectFeatureMatches(trimmedSearchText, features)
    const detectedFeatureSlugs = detectedFeatureMatches.map(
      (featureMatch) => featureMatch.slug,
    )
    const cleanSearchQuery = buildCleanSearchQuery(trimmedSearchText, [
      detectedCategoryMatch?.matchedCandidate ?? '',
      ...detectedFeatureMatches.flatMap((featureMatch) => featureMatch.matchedCandidates),
    ])

    if (nextCategorySlug) {
      nextSearchParams.set('category', nextCategorySlug)
    }

    if (cleanSearchQuery) {
      nextSearchParams.set('q', cleanSearchQuery)
    }

    if (detectedFeatureSlugs.length > 0) {
      nextSearchParams.set('features', detectedFeatureSlugs.join(','))
    }

    const nextQueryString = nextSearchParams.toString()

    if (!nextQueryString) {
      return
    }

    navigate(`/busqueda?${nextQueryString}`)
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-transparent">
      <div className="relative flex min-h-[560px] items-center px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[620px] lg:px-10 lg:py-12 2xl:px-14">
        <HeroBackgroundMosaic />

        <div className="relative mx-auto flex w-full max-w-[1720px] justify-center">
          <div className="w-full max-w-5xl space-y-16 text-center sm:space-y-8 lg:space-y-10">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Encontrá la locación perfecta para tu próxima producción.
                </h1>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-full border border-white/10 bg-black/72 px-3 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[10px] sm:px-4"
            >
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar locaciones..."
                className="min-h-14 flex-1 bg-transparent px-3 text-base text-brand-100 outline-none transition placeholder:text-brand-100/42 sm:text-lg"
              />

              <button
                type="submit"
                aria-label="Buscar"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-300 text-brand-950 shadow-[0_12px_28px_rgba(155,120,88,0.24)] transition duration-200 hover:bg-brand-100"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
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
