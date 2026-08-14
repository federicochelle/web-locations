import type { ReactNode, RefObject } from 'react'

import headerBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.40 PM.webp'

type SelectionDrawerHeaderProps = {
  closeAriaLabel: string
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  closeDisabled?: boolean
  hiddenLabel?: string
  hiddenLabelId?: string
  leftContent: ReactNode
  onClose: () => void
}

const drawerHeaderOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const drawerHeaderHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

const drawerHeaderCloseButtonClassName =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/10 text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-14px_30px_rgba(0,0,0,0.22),0_10px_24px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-14px_30px_rgba(0,0,0,0.18),0_12px_26px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]'

export function SelectionDrawerHeader({
  closeAriaLabel,
  closeButtonRef,
  closeDisabled = false,
  hiddenLabel,
  hiddenLabelId,
  leftContent,
  onClose,
}: SelectionDrawerHeaderProps) {
  return (
    <header className="relative shrink-0 overflow-hidden border-b border-white/10">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={headerBackgroundUrl}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/46" />
        <div className={drawerHeaderOverlayClassName} />
        <div className={drawerHeaderHighlightClassName} />
      </div>
      <div className="relative flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          {hiddenLabel && hiddenLabelId ? (
            <span id={hiddenLabelId} className="sr-only">
              {hiddenLabel}
            </span>
          ) : null}
          {leftContent}
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          className={drawerHeaderCloseButtonClassName}
          aria-label={closeAriaLabel}
        >
          <span className="text-[1.55rem] leading-none">×</span>
        </button>
      </div>
    </header>
  )
}
