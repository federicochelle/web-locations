import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import logoUrl from '../../../logo.webp'

type AuthRequiredModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  loginLabel?: string
  loginState?: unknown
  primaryAction?: 'login' | 'register'
  registerLabel?: string
  registerState?: unknown
}

export function AuthRequiredModal({
  description = 'Para consultar esta locacion y organizarla dentro de tus proyectos, necesitas ingresar a tu cuenta.',
  isOpen,
  loginLabel = 'Ingresar',
  onClose,
  primaryAction = 'login',
  registerLabel = 'Crear cuenta',
  loginState,
  registerState,
  title = 'Inicia sesion para solicitar informacion',
}: AuthRequiredModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const primaryActionRef = useRef<HTMLAnchorElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => {
      primaryActionRef.current?.focus({ preventScroll: true })
    })

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
      previouslyFocusedElementRef.current?.focus?.({ preventScroll: true })
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const modal = (
    <div
      className="fixed inset-0 z-[140] grid place-items-center bg-black/60 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
        className="relative w-full max-w-4xl overflow-hidden rounded-[1rem] border border-white/10 bg-[#1B1B1D] text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/4 text-brand-100/72 transition hover:bg-white/6 hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
          aria-label="Cerrar modal"
        >
          <span className="text-[1.55rem] leading-none">×</span>
        </button>

        <div className="flex flex-col md:flex-row">
          <div className="flex min-h-[12rem] items-center justify-center border-b border-white/10 px-6 py-8 md:min-h-[22rem] md:w-[42%] md:border-b-0 md:border-r md:px-8">
            <img
              src={logoUrl}
              alt="Film Locations Uruguay"
              className="h-36 w-auto max-w-full object-contain sm:h-40 md:h-48"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-7 px-6 py-8 sm:px-7 sm:py-8 md:px-9 md:py-10">
            <div className="max-w-xl space-y-4 pr-10 md:pr-12">
              <h2
                id="auth-required-title"
                className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-[2.15rem]"
              >
                {title}
              </h2>
              <p className="text-sm leading-6 text-brand-100/68 sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryAction === 'register' ? (
                <>
                  <Link
                    ref={primaryActionRef}
                    to="/register"
                    state={registerState}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
                  >
                    {registerLabel}
                  </Link>
                  <Link
                    to="/login"
                    state={loginState}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
                  >
                    {loginLabel}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    ref={primaryActionRef}
                    to="/login"
                    state={loginState}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
                  >
                    {loginLabel}
                  </Link>
                  <Link
                    to="/register"
                    state={registerState}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
                  >
                    {registerLabel}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
