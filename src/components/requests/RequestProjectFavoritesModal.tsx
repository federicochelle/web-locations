import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { PublicLocationCard } from '@/types/location.ts'

type RequestProjectFavoritesModalProps = {
  favorites: PublicLocationCard[]
  favoriteCount: number
  isLoading: boolean
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (locationIds: string[]) => Promise<void>
}

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function RequestProjectFavoritesModal({
  favorites,
  favoriteCount,
  isLoading,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RequestProjectFavoritesModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([])
    }
  }, [isOpen])

  const selectedCount = selectedIds.length
  const hasFavorites = favorites.length > 0
  const hasAnyFavorites = favoriteCount > 0

  const allSelected = useMemo(
    () => hasFavorites && selectedIds.length === favorites.length,
    [favorites.length, hasFavorites, selectedIds.length],
  )

  if (!isOpen) {
    return null
  }

  function toggleLocation(locationId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(locationId)
        ? currentIds.filter((currentId) => currentId !== locationId)
        : [...currentIds, locationId],
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedIds.length === 0 || isSubmitting) {
      return
    }

    await onSubmit(selectedIds)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
              Favoritos
            </p>
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Agregar desde favoritos
              </h2>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Selecciona las locaciones favoritas que quieras sumar a este proyecto.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm text-brand-950">
            {selectedCount} seleccionada{selectedCount === 1 ? '' : 's'}
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[180px] animate-pulse rounded-[1.5rem] bg-sand-200"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && !hasFavorites ? (
            <div className="rounded-[1.5rem] border border-black/5 bg-sand-50 p-6">
              <h3 className="text-lg font-semibold text-brand-950">
                {hasAnyFavorites
                  ? 'Todas tus locaciones favoritas ya forman parte de este proyecto.'
                  : 'Aun no tienes locaciones en favoritos.'}
              </h3>
              <p className="mt-2 text-sm text-sand-700">
                {hasAnyFavorites
                  ? 'Puedes explorar mas locaciones y guardarlas en favoritos para agregarlas despues.'
                  : 'Guarda locaciones que te interesen y luego podras agregarlas a tus solicitudes.'}
              </p>
              <Link
                to="/locations"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Ir a explorar locaciones
              </Link>
            </div>
          ) : null}

          {!isLoading && hasFavorites ? (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(allSelected ? [] : favorites.map((favorite) => favorite.id))
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-brand-950 transition hover:bg-sand-50"
                >
                  {allSelected ? 'Limpiar seleccion' : 'Seleccionar todas'}
                </button>
              </div>

              <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
                {favorites.map((favorite) => {
                  const checked = selectedIds.includes(favorite.id)

                  return (
                    <label
                      key={favorite.id}
                      className={`flex cursor-pointer gap-4 rounded-[1.5rem] border p-4 transition ${
                        checked
                          ? 'border-brand-300 bg-brand-50'
                          : 'border-black/5 bg-white hover:bg-sand-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          toggleLocation(favorite.id)
                        }}
                        className="mt-1 h-4 w-4 accent-brand-500"
                        disabled={isSubmitting}
                      />

                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-24 w-24 flex-none overflow-hidden rounded-[1.15rem] bg-sand-100">
                          {favorite.coverImageUrl ? (
                            <div
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${favorite.coverImageUrl})` }}
                            />
                          ) : (
                            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))]" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-2">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sand-700">
                            {favorite.categoryName}
                          </p>
                          <div className="space-y-1">
                            <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-950">
                              {formatLocationCode(favorite.locationCode)}
                            </p>
                            <p className="text-sm text-sand-700">
                              {favorite.departmentName} · {favorite.zoneName}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 text-sm font-medium text-brand-950 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length === 0 || !hasFavorites}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Agregando locaciones...' : 'Agregar seleccionadas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
