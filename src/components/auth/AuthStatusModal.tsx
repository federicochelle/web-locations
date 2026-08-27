import { useId, useRef } from 'react'

import { AppModal } from '@/components/ui/AppModal.tsx'
import logoUrl from '../../../logo.webp'

type AuthStatusModalProps = {
  isOpen: boolean
  title: string
  message: string
  primaryLabel: string
  onPrimaryAction: () => void
  secondaryLabel?: string
  onSecondaryAction?: () => void
}

export function AuthStatusModal({
  isOpen,
  title,
  message,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: AuthStatusModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <AppModal
      open={isOpen}
      onClose={onPrimaryAction}
      titleId={titleId}
      descriptionId={descriptionId}
      closeOnEscape={false}
      closeOnOverlayClick={false}
      initialFocusRef={primaryButtonRef}
      panelClassName="max-w-[30rem] border-brand-300/30 bg-[linear-gradient(180deg,rgba(27,27,29,0.98),rgba(17,17,19,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center text-center"
        >
          <img
            src={logoUrl}
            alt="Film Locations UY"
            className="mb-5 h-auto w-24 sm:w-28"
          />
          <h2
            id={titleId}
            className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-white"
          >
            {title}
          </h2>
          <p
            id={descriptionId}
            className="mt-4 max-w-md text-sm leading-6 text-brand-100/74 sm:text-base"
          >
            {message}
          </p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:min-w-48">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-brand-300/35 bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
            >
              {primaryLabel}
            </button>
            {secondaryLabel && onSecondaryAction ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6"
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </AppModal>
  )
}
