import { useState } from 'react'

export type RequestProjectFormValues = {
  title: string
  message: string
}

const INITIAL_VALUES: RequestProjectFormValues = {
  title: '',
  message: '',
}

type RequestProjectFormProps = {
  error: string | null
  isSubmitting: boolean
  submitLabel?: string
  submittingLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  onSubmit: (values: RequestProjectFormValues) => Promise<void>
}

export function RequestProjectForm({
  error,
  isSubmitting,
  submitLabel = 'Crear proyecto',
  submittingLabel = 'Creando proyecto...',
  cancelLabel = 'Cancelar',
  onCancel,
  onSubmit,
}: RequestProjectFormProps) {
  const [values, setValues] = useState<RequestProjectFormValues>(INITIAL_VALUES)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values.title.trim()) {
      setValidationError('Ingresa un titulo para tu proyecto.')
      return
    }

    setValidationError(null)
    await onSubmit(values)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {validationError ? (
        <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {validationError}
        </div>
      ) : null}

      <label className="block space-y-2.5">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Titulo
        </span>
        <input
          type="text"
          value={values.title}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              title: event.target.value,
            }))
            setValidationError(null)
          }}
          className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
          placeholder="Ej. Campana exterior de verano"
          disabled={isSubmitting}
        />
      </label>

      <label className="block space-y-2.5">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Mensaje
        </span>
        <textarea
          value={values.message}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              message: event.target.value,
            }))
          }}
          rows={6}
          className="w-full rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
          placeholder="Describe brevemente tu proyecto."
          disabled={isSubmitting}
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
