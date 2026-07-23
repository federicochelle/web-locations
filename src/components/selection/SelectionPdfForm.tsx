import { useId, useRef } from 'react'

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

type DateInputWithVisualShellProps = {
  id: string
  name: keyof SelectionPdfFormValues
  label: string
  value: string
  error?: string
  disabled: boolean
  min?: string
  compact: boolean
  onChange: (field: keyof SelectionPdfFormValues, value: string) => void
}

function formatDateValue(value: string) {
  if (!value) {
    return 'dd/mm/aaaa'
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.25 3.75v2.5" />
      <path d="M16.75 3.75v2.5" />
      <path d="M4.75 9.25h14.5" />
      <rect x="4.75" y="5.75" width="14.5" height="13.5" rx="2.25" />
    </svg>
  )
}

function DateInputWithVisualShell({
  id,
  name,
  label,
  value,
  error,
  disabled,
  min,
  compact,
  onChange,
}: DateInputWithVisualShellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const errorId = `${id}-error`
  const hintId = useId()
  const hasError = Boolean(error)
  const displayValue = formatDateValue(value)

  function openPicker() {
    if (disabled) {
      return
    }

    const input = inputRef.current

    if (!input) {
      return
    }

    input.focus()

    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.click()
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-brand-100">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={`${compact ? 'min-h-11 rounded-xl px-3.5' : 'min-h-12 rounded-2xl px-4'} flex w-full items-center border bg-white/6 pr-11 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            hasError
              ? 'border-red-300 focus-visible:ring-red-300'
              : 'border-white/12 hover:bg-white/8'
          }`}
          aria-haspopup="dialog"
          aria-controls={id}
          aria-describedby={hasError ? errorId : hintId}
        >
          <span className={value ? 'text-brand-100' : 'text-brand-100/40'}>
            {displayValue}
          </span>
        </button>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="date"
          value={value}
          min={min}
          disabled={disabled}
          onChange={(event) => {
            onChange(name, event.target.value)
          }}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : hintId}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 transition ${
            disabled ? 'text-brand-100/35' : value ? 'text-brand-100/72' : 'text-brand-100/48'
          }`}
        >
          <CalendarIcon />
        </span>
        <span id={hintId} className="sr-only">
          {value ? 'Fecha seleccionada' : 'Seleccionar fecha'}
        </span>
      </div>
      {hasError ? (
        <p id={errorId} className="mt-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}

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
        const isDateField = field.type === 'date'
        const min =
          field.name === 'tentativeEndDate' && values.tentativeStartDate
            ? values.tentativeStartDate
            : undefined

        return (
          <div key={field.name}>
            {isDateField ? (
              <DateInputWithVisualShell
                id={field.name}
                name={field.name}
                label={field.label}
                value={values[field.name]}
                error={errors[field.name]}
                disabled={disabled}
                min={min}
                compact={isCompact}
                onChange={onChange}
              />
            ) : (
              <>
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
              </>
            )}
            {hasError && !isDateField ? (
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
