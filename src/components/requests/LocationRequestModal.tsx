import { useEffect, useState } from 'react'

const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 1000

type LocationRequestModalProps = {
  isOpen: boolean
  locationName: string
  isSubmitting: boolean
  submitError: string | null
  onClose: () => void
  onSubmit: (message: string) => Promise<boolean>
}

export function LocationRequestModal({
  isOpen,
  locationName,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: LocationRequestModalProps) {
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setMessage('')
      setValidationError(null)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      setValidationError('Escribe un mensaje para enviar tu solicitud.')
      return
    }

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setValidationError(
        `El mensaje debe tener al menos ${MIN_MESSAGE_LENGTH} caracteres.`,
      )
      return
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setValidationError(
        `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
      )
      return
    }

    setValidationError(null)

    const submitted = await onSubmit(trimmedMessage)

    if (submitted) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
            Solicitud
          </p>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
              Solicitar informacion
            </h2>
            <p className="text-sm leading-6 text-sand-700 sm:text-base">
              Locacion: {locationName}
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {submitError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {submitError}
            </div>
          ) : null}

          {validationError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {validationError}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
              Mensaje
            </span>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                setValidationError(null)
              }}
              rows={6}
              maxLength={MAX_MESSAGE_LENGTH}
              className="w-full rounded-[1.5rem] border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
              placeholder="Cuéntanos qué información necesitas sobre esta locación."
              disabled={isSubmitting}
            />
            <p className="text-xs text-sand-700">
              {message.trim().length}/{MAX_MESSAGE_LENGTH}
            </p>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 text-sm font-medium text-brand-950 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
