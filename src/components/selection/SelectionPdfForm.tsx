import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
} from '@/types/selection-pdf.ts'

type SelectionPdfFormProps = {
  values: SelectionPdfFormValues
  errors: SelectionPdfFormErrors
  onChange: (field: keyof SelectionPdfFormValues, value: string) => void
  disabled?: boolean
  variant?: 'default' | 'compact'
  columns?: 1 | 2
  showTentativeDates?: boolean
}

type FieldConfig = {
  name: keyof SelectionPdfFormValues
  label: string
  type?: 'text' | 'email' | 'date'
  autoComplete?: string
  placeholder?: string
}

const fields: FieldConfig[] = [
  {
    name: 'product',
    label: 'Producto',
    autoComplete: 'organization-title',
    placeholder: 'Ej. Campana verano 2026',
  },
  {
    name: 'productionCompany',
    label: 'Productora',
    autoComplete: 'organization',
    placeholder: 'Nombre de la empresa',
  },
  {
    name: 'locationManager',
    label: 'Jefe de locaciones',
    autoComplete: 'name',
    placeholder: 'Nombre y apellido',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'nombre@empresa.com',
  },
  {
    name: 'tentativeStartDate',
    label: 'Fecha desde',
    type: 'date',
  },
  {
    name: 'tentativeEndDate',
    label: 'Fecha hasta',
    type: 'date',
  },
]

export function SelectionPdfForm({
  values,
  errors,
  onChange,
  disabled = false,
  variant = 'default',
  columns = 1,
  showTentativeDates = true,
}: SelectionPdfFormProps) {
  const isCompact = variant === 'compact'
  const useTwoColumns = columns === 2
  const visibleFields = showTentativeDates
    ? fields
    : fields.filter(
        (field) =>
          field.name !== 'tentativeStartDate' && field.name !== 'tentativeEndDate',
      )

  return (
    <div
      className={
        useTwoColumns
          ? isCompact
            ? 'grid gap-x-4 gap-y-3 sm:grid-cols-2'
            : 'grid gap-x-4 gap-y-4 sm:grid-cols-2'
          : isCompact
            ? 'space-y-3'
            : 'space-y-4'
      }
    >
      {visibleFields.map((field) => {
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
              placeholder={field.placeholder}
              disabled={disabled}
              onChange={(event) => {
                onChange(field.name, event.target.value)
              }}
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className={`${isCompact ? 'min-h-11 rounded-xl px-3.5' : 'min-h-12 rounded-2xl px-4'} w-full border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/40 focus-visible:ring-2 focus-visible:ring-brand-300 ${
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
    </div>
  )
}
