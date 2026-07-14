import { useEffect } from 'react'

type SubmissionLoadingModalProps = {
  isOpen: boolean
  phase?: 'saving' | 'uploading'
}

export function SubmissionLoadingModal({
  isOpen,
  phase = 'saving',
}: SubmissionLoadingModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const statusMessage = phase === 'uploading'
    ? 'Procesando y subiendo tus fotografias...'
    : 'Guardando tu postulacion...'

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 px-4 pt-64 backdrop-blur-sm sm:pt-80">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-loading-title"
        aria-describedby="submission-loading-description"
        className="w-full max-w-md rounded-[1rem] border border-white/10 bg-[#1B1B1D] p-6 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-7"
      >
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
            Enviando tu postulacion
          </h2>

          <p
            id="submission-loading-description"
            className="mt-3 text-sm leading-6 text-brand-100/68 sm:text-base"
          >
            Estamos guardando los datos y procesando las imagenes. Esto puede
            demorar unos segundos.
          </p>

          <p aria-live="polite" className="mt-4 text-sm font-medium text-brand-300">
            {statusMessage}
          </p>
        </div>
      </div>
    </div>
  )
}
