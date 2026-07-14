import { useEffect, useRef } from 'react'

type SubmissionResultModalProps = {
  isOpen: boolean
  title: string
  description: string
  variant: 'success' | 'partial-success' | 'error'
  primaryActionLabel: string
  secondaryActionLabel?: string
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
  onClose: () => void
}

export function SubmissionResultModal({
  isOpen,
  title,
  description,
  variant,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
}: SubmissionResultModalProps) {
  const primaryActionRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    primaryActionRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const isError = variant === 'error'
  const isPartial = variant === 'partial-success'
  const accentClassName = isError
    ? 'border-red-400/30 bg-red-500/10 text-red-200'
    : isPartial
    ? 'border-brand-300/30 bg-brand-300/10 text-brand-300'
    : 'border-brand-300/30 bg-brand-300/10 text-brand-300'
  const icon = isError ? '!' : '✓'

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-4 pt-64 backdrop-blur-sm sm:pt-80"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-result-title"
        aria-describedby="submission-result-description"
        className="w-full max-w-lg rounded-[1rem] border border-white/10 bg-[#1B1B1D] p-5 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold ${accentClassName}`}
              aria-hidden="true"
            >
              {icon}
            </div>

            <div className="space-y-3">
              <h2
                id="submission-result-title"
                className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
              >
                {title}
              </h2>
              <p
                id="submission-result-description"
                className="text-sm leading-6 text-brand-100/68 sm:text-base"
              >
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-300 text-brand-950 transition hover:bg-brand-100"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={primaryActionRef}
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
          >
            {primaryActionLabel}
          </button>

          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
