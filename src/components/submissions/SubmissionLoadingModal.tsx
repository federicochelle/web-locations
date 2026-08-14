import { AppModal } from '@/components/ui/AppModal.tsx'

type SubmissionLoadingModalProps = {
  isOpen: boolean
  phase?: 'saving' | 'uploading'
  title?: string
  description?: string
  statusMessage?: string
  progressPercent?: number | null
}

export function SubmissionLoadingModal({
  isOpen,
  phase = 'saving',
  title = 'Enviando tu postulacion',
  description = 'Estamos guardando los datos y procesando las imagenes. Esto puede demorar unos segundos.',
  statusMessage,
  progressPercent = null,
}: SubmissionLoadingModalProps) {
  const liveStatusMessage = statusMessage ?? (phase === 'uploading'
    ? 'Procesando y subiendo tus fotografias...'
    : 'Guardando tu postulacion...')

  return (
    <AppModal
      open={isOpen}
      onClose={() => {}}
      titleId="submission-loading-title"
      descriptionId="submission-loading-description"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      panelClassName="max-w-md p-6 sm:p-7"
    >
      <div>
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-300/30 bg-brand-300/10"
            aria-hidden="true"
          >
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-300/25 border-t-brand-300" />
          </div>

          <h2
            id="submission-loading-title"
            className="mt-5 font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
          >
            {title}
          </h2>

          <p
            id="submission-loading-description"
            className="mt-3 text-sm leading-6 text-brand-100/68 sm:text-base"
          >
            {description}
          </p>

          <p aria-live="polite" className="mt-4 text-sm font-medium text-brand-300">
            {liveStatusMessage}
          </p>

          {progressPercent !== null ? (
            <div className="mt-5 w-full">
              <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-brand-100/60">
                <span>Progreso</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-brand-300 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppModal>
  )
}
