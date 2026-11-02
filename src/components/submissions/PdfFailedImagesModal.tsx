import { useRef } from 'react'

import { AppModal } from '@/components/ui/AppModal.tsx'
import type {
  PdfFailedImagesDecision,
  PdfFailedImagesSummary,
} from '@/utils/selection-pdf-failures.ts'
import { formatPdfLocationCode } from '@/utils/selection-pdf-layout.ts'

type PdfFailedImagesModalProps = {
  summary: PdfFailedImagesSummary | null
  onDecision: (decision: PdfFailedImagesDecision) => void
}

const SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]'

function buildLostLocationsMessage(summary: PdfFailedImagesSummary) {
  const lostLocations = summary.locations.filter((location) => location.isLost)
  const codes = lostLocations.map((location) => formatPdfLocationCode(location.locationCode)).join(', ')

  return lostLocations.length === 1
    ? `La locación ${codes} no aparecerá en el PDF porque ninguna de sus fotos se pudo cargar.`
    : `Las locaciones ${codes} no aparecerán en el PDF porque ninguna de sus fotos se pudo cargar.`
}

export function PdfFailedImagesModal({ summary, onDecision }: PdfFailedImagesModalProps) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <AppModal
      open={summary !== null}
      onClose={() => {}}
      titleId="pdf-failed-images-title"
      descriptionId="pdf-failed-images-description"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      initialFocusRef={retryButtonRef}
      panelClassName="max-w-lg p-5 sm:p-6"
    >
      {summary ? (
        <div>
          <div className="space-y-3">
            <h2
              id="pdf-failed-images-title"
              className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
            >
              Algunas fotos no se pudieron cargar
            </h2>
            <p
              id="pdf-failed-images-description"
              className="text-sm leading-6 text-brand-100/68 sm:text-base"
            >
              {summary.failedCount === 1
                ? 'No pudimos incluir 1 foto en el PDF, aunque lo intentamos varias veces.'
                : `No pudimos incluir ${summary.failedCount} fotos en el PDF, aunque lo intentamos varias veces.`}{' '}
              Podés reintentar o continuar sin ellas.
            </p>
          </div>

          {summary.lostLocationCount > 0 ? (
            <div
              role="alert"
              className="mt-4 rounded-[1rem] border border-red-300/30 bg-red-200/10 p-4 text-sm leading-6 text-red-100"
            >
              <p className="font-medium">
                {summary.lostLocationCount === 1
                  ? 'Se perdería una locación completa'
                  : `Se perderían ${summary.lostLocationCount} locaciones completas`}
              </p>
              <p className="mt-1 text-red-100/85">{buildLostLocationsMessage(summary)}</p>
            </div>
          ) : null}

          <ul className="mt-4 max-h-56 space-y-3 overflow-y-auto overscroll-contain rounded-[1rem] border border-white/10 bg-white/4 p-4 text-sm">
            {summary.locations.map((location) => (
              <li key={location.locationCode}>
                <p className="font-medium text-brand-100">
                  {formatPdfLocationCode(location.locationCode)}
                  <span className="font-normal text-brand-100/60">
                    {' '}
                    · {location.failedPhotos.length} de {location.totalPhotos}{' '}
                    {location.totalPhotos === 1 ? 'foto' : 'fotos'}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5 text-brand-100/68">
                  {location.failedPhotos.map((photo) => (
                    <li key={photo.position}>
                      Foto {photo.position}: {photo.message}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              ref={retryButtonRef}
              type="button"
              onClick={() => {
                onDecision('retry')
              }}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => {
                onDecision('continue')
              }}
              className={SECONDARY_BUTTON_CLASS_NAME}
            >
              Continuar sin ellas
            </button>
            <button
              type="button"
              onClick={() => {
                onDecision('cancel')
              }}
              className={SECONDARY_BUTTON_CLASS_NAME}
            >
              Cancelar envío
            </button>
          </div>
        </div>
      ) : null}
    </AppModal>
  )
}
