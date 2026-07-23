import { useRef } from 'react'

import { AppModal } from '@/components/ui/AppModal.tsx'

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

  const isError = variant === 'error'
  const isPartial = variant === 'partial-success'
  const accentClassName = isError
    ? 'border-red-400/30 bg-red-500/10 text-red-200'
    : isPartial
    ? 'border-brand-300/30 bg-brand-300/10 text-brand-300'
    : 'border-brand-300/30 bg-brand-300/10 text-brand-300'
  const icon = isError ? '!' : '✓'

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      titleId="submission-result-title"
      descriptionId="submission-result-description"
      closeOnOverlayClick
      closeOnEscape
      initialFocusRef={primaryActionRef}
      panelClassName="max-w-lg p-5 sm:p-6"
    >
      <div>
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
    </AppModal>
  )
}
