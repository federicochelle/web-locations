import type { FormEvent } from 'react'

import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
} from '@/types/selection-pdf.ts'

type SelectionPdfFormProps = {
  values: SelectionPdfFormValues
  errors: SelectionPdfFormErrors
  onChange: (field: keyof SelectionPdfFormValues, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

type FieldConfig = {
  name: keyof SelectionPdfFormValues
  label: string
  type?: 'text' | 'email'
  autoComplete?: string
}

const fields: FieldConfig[] = [
  {
    name: 'product',
    label: 'Producto',
    autoComplete: 'organization-title',
  },
  {
    name: 'productionCompany',
    label: 'Productora',
    autoComplete: 'organization',
  },
  {
    name: 'locationManager',
    label: 'Jefe de locaciones',
    autoComplete: 'name',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
  },
]

export function SelectionPdfForm({
  values,
  errors,
  onChange,
  onSubmit,
}: SelectionPdfFormProps) {
  return (
    <form className="space-y-4" noValidate onSubmit={onSubmit}>
      {fields.map((field) => {
        const errorId = `${field.name}-error`
        const hasError = Boolean(errors[field.name])

        return (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="mb-2 block text-sm font-medium text-brand-100"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => {
                onChange(field.name, event.target.value)
              }}
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className={`min-h-12 w-full rounded-2xl border bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/40 focus-visible:ring-2 focus-visible:ring-brand-300 ${
                hasError
                  ? 'border-red-300 focus-visible:ring-red-300'
                  : 'border-white/12'
              }`}
            />
            {hasError ? (
              <p id={errorId} className="mt-2 text-sm text-red-200">
                {errors[field.name]}
              </p>
            ) : null}
          </div>
        )
      })}

      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
      >
        Preparar datos
      </button>
    </form>
  )
}
