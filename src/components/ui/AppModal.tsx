import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type AppModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  titleId?: string
  descriptionId?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  panelClassName?: string
}

export const APP_MODAL_Z_INDEX_CLASS = 'z-[100]'

export function AppModal({
  open,
  onClose,
  children,
  titleId,
  descriptionId,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
  panelClassName = '',
}: AppModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const fallbackTitleId = useId()
  const fallbackDescriptionId = useId()

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frameId = window.requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }

      panelRef.current?.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (!closeOnEscape || event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frameId)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)

      if (restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus()
      }
    }
  }, [closeOnEscape, initialFocusRef, onClose, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${APP_MODAL_Z_INDEX_CLASS} flex items-center justify-center bg-black/65 px-4 py-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:px-6 sm:py-6`}
      onClick={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId ?? fallbackTitleId}
        aria-describedby={descriptionId ?? fallbackDescriptionId}
        tabIndex={-1}
        className={`w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[1rem] border border-white/10 bg-[#1B1B1D] text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] outline-none sm:max-h-[calc(100dvh-3rem)] ${panelClassName}`.trim()}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
