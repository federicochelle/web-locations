import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { SelectedLocationGroup } from '@/components/selection/SelectedLocationGroup.tsx'
import { SELECTION_DRAWER_TRIGGER_ID } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'

const SelectionPdfFlow = lazy(() =>
  import('@/components/selection/SelectionPdfFlow.tsx').then((module) => ({
    default: module.SelectionPdfFlow,
  })),
)

type GroupedSelection = {
  locationId: string
  locationCode: string
  locationTitle: string
  categorySlug: string
  images: SelectedLocationImage[]
}

function sortGroupImages(images: SelectedLocationImage[]) {
  return [...images].sort((left, right) => {
    const leftSortOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
    const rightSortOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder
    }

    return left.selectedAt.localeCompare(right.selectedAt)
  })
}

function groupImagesByLocation(images: SelectedLocationImage[]) {
  const groupedSelections = new Map<string, GroupedSelection>()

  for (const image of images) {
    const existingGroup = groupedSelections.get(image.locationId)

    if (existingGroup) {
      existingGroup.images.push(image)
      continue
    }

    groupedSelections.set(image.locationId, {
      locationId: image.locationId,
      locationCode: image.locationCode,
      locationTitle: image.locationTitle,
      categorySlug: image.categorySlug,
      images: [image],
    })
  }

  return [...groupedSelections.values()].map((group) => ({
    ...group,
    images: sortGroupImages(group.images),
  }))
}

export function SelectionDrawer() {
  const {
    images,
    isDrawerOpen,
    closeDrawer,
    clearSelection,
    removeImage,
  } = useImageSelection()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(isDrawerOpen)
  const [activeView, setActiveView] = useState<'selection' | 'pdf-flow'>('selection')

  const groupedSelections = useMemo(
    () => groupImagesByLocation(images),
    [images],
  )

  useEffect(() => {
    if (!isDrawerOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDrawer, isDrawerOpen])

  useEffect(() => {
    if (wasOpenRef.current && !isDrawerOpen) {
      setActiveView('selection')
      const trigger = document.getElementById(SELECTION_DRAWER_TRIGGER_ID)
      if (trigger instanceof HTMLButtonElement) {
        trigger.focus()
      }
    }

    wasOpenRef.current = isDrawerOpen
  }, [isDrawerOpen])

  if (!isDrawerOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Cerrar seleccion de imagenes"
        className="absolute inset-0 bg-[#14110f]/72 backdrop-blur-[2px]"
        onClick={closeDrawer}
      />
      <aside
        id="selection-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selection-drawer-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#14110f] text-brand-100 shadow-[-16px_0_48px_rgba(0,0,0,0.32)] sm:w-[min(92vw,460px)]"
      >
        {activeView === 'selection' ? (
          <>
            <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div>
                <h2
                  id="selection-drawer-title"
                  className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100"
                >
                  Seleccion de imagenes
                </h2>
                <p className="mt-1 text-sm text-brand-300">
                  {images.length} {images.length === 1 ? 'imagen guardada' : 'imagenes guardadas'}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                aria-label="Cerrar drawer de seleccion"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {groupedSelections.length > 0 ? (
                <div className="space-y-4">
                  {groupedSelections.map((group) => (
                    <SelectedLocationGroup
                      key={group.locationId}
                      locationCode={group.locationCode}
                      categorySlug={group.categorySlug}
                      locationTitle={group.locationTitle}
                      images={group.images}
                      onRemoveImage={removeImage}
                      onNavigate={closeDrawer}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="max-w-sm">
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                      Tu seleccion esta vacia
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-brand-300">
                      Guarda imagenes desde las locaciones para revisarlas aqui mientras navegas.
                    </p>
                    <Link
                      to="/#explorar"
                      onClick={closeDrawer}
                      className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                    >
                      Explorar locaciones
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <footer className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('pdf-flow')
                  }}
                  disabled={images.length === 0}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={images.length === 0}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpiar seleccion
                </button>
              </div>
            </footer>
          </>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center px-4 py-10">
                <div className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-brand-100">
                  Cargando...
                </div>
              </div>
            }
          >
            <SelectionPdfFlow
              onBack={() => {
                setActiveView('selection')
              }}
              onClose={closeDrawer}
            />
          </Suspense>
        )}
      </aside>
    </div>
  )
}
