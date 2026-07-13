import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

type AuthRequiredModalProps = {
  isOpen: boolean
  onClose: () => void
  loginState?: unknown
  registerState?: unknown
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  loginState,
  registerState,
}: AuthRequiredModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const primaryActionRef = useRef<HTMLAnchorElement | null>(null)

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

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
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
        className="w-full max-w-lg rounded-[1rem] border border-white/10 bg-[#1B1B1D] p-5 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h2
              id="auth-required-title"
              className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
            >
              Inicia sesion para solicitar informacion
            </h2>
            <p className="text-sm leading-6 text-brand-100/68 sm:text-base">
              Para consultar esta locacion y organizarla dentro de tus proyectos,
              necesitas ingresar a tu cuenta.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-brand-100/72 transition hover:bg-white/6 hover:text-brand-100"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            ref={primaryActionRef}
            to="/login"
            state={loginState}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
          >
            Ingresar
          </Link>
          <Link
            to="/register"
            state={registerState}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}
