import { useEffect, useRef, useState } from 'react'

import {
  getSearchInterpretationFallbackReason,
  interpretLocationSearchQuery,
} from '@/features/search/interpretation/search-interpretation.service.ts'
import type {
  SearchInterpretationFallbackReason,
  SearchInterpretationSnapshot,
  UseLocationSearchInterpretationOptions,
  UseLocationSearchInterpretationResult,
} from '@/features/search/interpretation/search-interpretation.types.ts'

const searchInterpretationCache = new Map<string, SearchInterpretationSnapshot>()
const searchInterpretationInFlight = new Map<string, Promise<SearchInterpretationSnapshot>>()

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ')
}

function buildFallbackSnapshot(
  rawQuery: string,
  usedAi: boolean,
  durationMs: number,
  fallbackReason: SearchInterpretationFallbackReason | null,
) {
  return {
    rawQuery,
    coreQuery: rawQuery,
    optionalTerms: [],
    usedAi,
    fallback: usedAi,
    fallbackReason,
    durationMs,
  } satisfies SearchInterpretationSnapshot
}

function logSearchInterpretation(
  snapshot: SearchInterpretationSnapshot,
  metadata: {
    requestKey: string
    source: 'cache' | 'network' | 'bypass'
  },
) {
  if (!import.meta.env.DEV) {
    return
  }

  console.info('[search-interpretation]', {
    requestKey: metadata.requestKey,
    source: metadata.source,
    ...snapshot,
  })
}

export function useLocationSearchInterpretation(
  options: UseLocationSearchInterpretationOptions,
): UseLocationSearchInterpretationResult {
  const { enabled = true, query } = options
  const normalizedQuery = normalizeQuery(query)
  const shouldUseAi = enabled && normalizedQuery.length > 0
  const latestRequestKeyRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [snapshot, setSnapshot] = useState<SearchInterpretationSnapshot>(() =>
    buildFallbackSnapshot(normalizedQuery, false, 0, null),
  )

  useEffect(() => {
    const nextFallbackSnapshot = buildFallbackSnapshot(normalizedQuery, false, 0, null)
    const requestKey = normalizedQuery.toLowerCase()

    if (!enabled || normalizedQuery.length === 0) {
      latestRequestKeyRef.current = null
      setSnapshot(nextFallbackSnapshot)
      setLoading(false)
      logSearchInterpretation(nextFallbackSnapshot, {
        requestKey,
        source: 'bypass',
      })
      return
    }

    const cachedSnapshot = searchInterpretationCache.get(requestKey)

    if (cachedSnapshot) {
      latestRequestKeyRef.current = requestKey
      setSnapshot(cachedSnapshot)
      setLoading(false)
      logSearchInterpretation(cachedSnapshot, {
        requestKey,
        source: 'cache',
      })
      return
    }

    let isCancelled = false
    latestRequestKeyRef.current = requestKey
    setLoading(true)

    async function runInterpretation() {
      const inFlightSnapshot = searchInterpretationInFlight.get(requestKey)
      const snapshotPromise =
        inFlightSnapshot ??
        (async () => {
          const startedAt = performance.now()

          try {
            const interpretation = await interpretLocationSearchQuery(normalizedQuery)
            const coreQuery = interpretation.coreQuery.trim() || normalizedQuery
            const normalizedCoreTerms = new Set(
              coreQuery
                .toLowerCase()
                .split(/\s+/)
                .map((term) => term.trim())
                .filter((term) => term.length > 0),
            )
            const optionalTerms = interpretation.optionalTerms
              .map((term) => term.trim())
              .filter((term) => term.length > 0)
              .filter((term) => !normalizedCoreTerms.has(term.toLowerCase()))
              .slice(0, 3)
            const nextSnapshot = {
              rawQuery: normalizedQuery,
              coreQuery,
              optionalTerms,
              usedAi: true,
              fallback: coreQuery === normalizedQuery && optionalTerms.length === 0,
              fallbackReason:
                coreQuery === normalizedQuery && optionalTerms.length === 0
                  ? 'empty-core-query'
                  : null,
              durationMs: Math.round(performance.now() - startedAt),
            } satisfies SearchInterpretationSnapshot

            if (!nextSnapshot.fallback) {
              searchInterpretationCache.set(requestKey, nextSnapshot)
            }

            return nextSnapshot
          } catch (error) {
            return buildFallbackSnapshot(
              normalizedQuery,
              true,
              Math.round(performance.now() - startedAt),
              getSearchInterpretationFallbackReason(error),
            )
          } finally {
            searchInterpretationInFlight.delete(requestKey)
          }
        })()

      if (!inFlightSnapshot) {
        searchInterpretationInFlight.set(requestKey, snapshotPromise)
      }

      const nextSnapshot = await snapshotPromise

      if (isCancelled || latestRequestKeyRef.current !== requestKey) {
        return
      }

      setSnapshot(nextSnapshot)
      logSearchInterpretation(nextSnapshot, {
        requestKey,
        source: 'network',
      })

      if (!isCancelled && latestRequestKeyRef.current === requestKey) {
        setLoading(false)
      }
    }

    void runInterpretation()

    return () => {
      isCancelled = true
    }
  }, [enabled, normalizedQuery, shouldUseAi])

  return {
    ...snapshot,
    loading,
    shouldUseAi,
  }
}
