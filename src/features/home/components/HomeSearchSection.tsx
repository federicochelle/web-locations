import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

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
    <section>
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-[1.75rem] border border-black/5 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
      >
        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium uppercase tracking-[0.2em] text-sand-500">
            Buscar por texto
          </span>
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Titulo o descripcion"
            className="min-h-13 w-full rounded-[1.25rem] border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
          />
        </label>

        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium uppercase tracking-[0.2em] text-sand-500">
            Buscar por categoria
          </span>
          <select
            value={selectedCategorySlug}
            onChange={(event) => setSelectedCategorySlug(event.target.value)}
            disabled={isLoading || categories.length === 0}
            className="min-h-13 w-full rounded-[1.25rem] border border-sand-200 bg-white px-4 text-sm text-brand-950 outline-none transition focus:border-brand-300 disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-sand-500"
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
          className="min-h-13 self-end rounded-[1.25rem] bg-brand-300 px-6 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
        >
          Buscar
        </button>
      </form>

      {error ? (
        <p className="mt-3 px-1 text-sm text-sand-700">
          No pudimos cargar las categorias para el selector. Igual puedes explorar
          todas las locaciones.
        </p>
      ) : null}
    </section>
  )
}
