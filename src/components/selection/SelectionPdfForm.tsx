import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import { getActiveProductionCompanies } from '@/services/production-companies.service.ts'
import type { ProductionCompany } from '@/types/production-company.ts'
import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
} from '@/types/selection-pdf.ts'
import { normalizePublicValue } from '@/utils/location-public.ts'

type SelectionPdfFormProps = {
  values: SelectionPdfFormValues
  errors: SelectionPdfFormErrors
  onChange: (field: keyof SelectionPdfFormValues, value: string | null) => void
  disabled?: boolean
  readOnlyFields?: Array<keyof SelectionPdfFormValues>
  variant?: 'default' | 'compact'
  columns?: 1 | 2
  showTentativeDates?: boolean
  desktopMessageSplit?: boolean
}

type FieldConfig = {
  name: keyof SelectionPdfFormValues
  label: string
  type?: 'text' | 'date' | 'textarea'
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
    name: 'tentativeStartDate',
    label: 'Fecha desde',
    type: 'date',
  },
  {
    name: 'tentativeEndDate',
    label: 'Fecha hasta',
    type: 'date',
  },
  {
    name: 'message',
    label: 'Mensaje',
    type: 'textarea',
    placeholder: 'Cuentanos sobre tu proyecto, presupuesto estimado o lo que necesites...',
  },
]

export type DateInputWithVisualShellProps = {
  id: string
  name: keyof SelectionPdfFormValues
  label: string
  value: string
  error?: string
  disabled: boolean
  min?: string
  compact: boolean
  onChange: (field: keyof SelectionPdfFormValues, value: string | null) => void
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

function getStaticFieldValue(
  fieldName: keyof SelectionPdfFormValues,
  value: string,
) {
  if (fieldName === 'tentativeStartDate' || fieldName === 'tentativeEndDate') {
    return value ? formatDateValue(value) : '—'
  }

  return value.trim() ? value : '—'
}

type StaticFieldProps = {
  label: string
  value: string
  compact: boolean
  multiline?: boolean
}

function StaticField({
  label,
  value,
  compact,
  multiline = false,
}: StaticFieldProps) {
  return (
    <>
      <label className="mb-2 block text-sm font-medium text-brand-100">
        {label}
      </label>
      <div
        className={`${multiline ? (compact ? 'min-h-[8.5rem] py-3' : 'min-h-[9.5rem] py-3') : compact ? 'min-h-11' : 'min-h-12'} flex w-full items-start text-sm text-brand-100/88 ${multiline ? 'whitespace-pre-wrap' : 'items-center'} ${compact ? 'px-0' : 'px-0'}`}
      >
        {value}
      </div>
    </>
  )
}

export function DateInputWithVisualShell({
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
      try {
        input.showPicker()
        return
      } catch {
        // Fall back to click when the browser blocks showPicker.
      }
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
          className={`${compact ? 'min-h-11 rounded-xl px-3.5' : 'min-h-12 rounded-2xl px-4'} relative z-10 flex w-full items-center border bg-white/6 pr-11 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
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
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          tabIndex={-1}
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

type ProductionCompanyFieldProps = {
  value: string
  selectedCompanyId: string | null
  error?: string
  disabled: boolean
  compact: boolean
  onChange: (field: keyof SelectionPdfFormValues, value: string | null) => void
}

function ProductionCompanyField({
  value,
  selectedCompanyId,
  error,
  disabled,
  compact,
  onChange,
}: ProductionCompanyFieldProps) {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [companies, setCompanies] = useState<ProductionCompany[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const errorId = 'productionCompany-error'
  const hasError = Boolean(error)

  useEffect(() => {
    if (!isAdmin) {
      setCompanies([])
      setCompaniesError(null)
      setIsLoadingCompanies(false)
      return
    }

    let isActive = true

    async function loadCompanies() {
      try {
        setIsLoadingCompanies(true)
        setCompaniesError(null)
        const nextCompanies = await getActiveProductionCompanies()

        if (!isActive) {
          return
        }

        setCompanies(nextCompanies)
      } catch (loadError) {
        console.error('Failed to load production companies suggestions', loadError)

        if (isActive) {
          setCompanies([])
          setCompaniesError('No se pudieron cargar las sugerencias')
        }
      } finally {
        if (isActive) {
          setIsLoadingCompanies(false)
        }
      }
    }

    void loadCompanies()

    return () => {
      isActive = false
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target

      if (
        rootRef.current &&
        target instanceof Node &&
        !rootRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  const filteredCompanies = useMemo(() => {
    if (!isAdmin) {
      return []
    }

    const query = normalizePublicValue(value)

    if (!query) {
      return companies
    }

    return companies.filter((company) =>
      normalizePublicValue(company.name).includes(query),
    )
  }, [companies, isAdmin, value])

  const selectedCompany = useMemo(
    () =>
      selectedCompanyId
        ? companies.find((company) => company.id === selectedCompanyId) ?? null
        : null,
    [companies, selectedCompanyId],
  )

  function openList() {
    if (disabled || !isAdmin) {
      return
    }

    setIsOpen(true)
  }

  if (!isAdmin) {
    return (
      <>
        <label
          htmlFor="productionCompany"
          className="mb-2 block text-sm font-medium text-brand-100"
        >
          Productora
        </label>
        <input
          id="productionCompany"
          name="productionCompany"
          type="text"
          value={value}
          placeholder="Nombre de la productora"
          autoComplete="organization"
          disabled={disabled}
          onChange={(event) => {
            onChange('productionCompany', event.target.value)
          }}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`${compact ? 'min-h-11 rounded-xl px-3.5' : 'min-h-12 rounded-2xl px-4'} w-full border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            hasError
              ? 'border-red-300 focus:ring-red-300'
              : 'border-white/12 hover:bg-white/8'
          }`}
        />
        {hasError ? (
          <p id={errorId} className="mt-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <>
      <label
        htmlFor="productionCompany"
        className="mb-2 block text-sm font-medium text-brand-100"
      >
        Productora
      </label>
      <div ref={rootRef} className="relative min-w-0">
        <input
          id="productionCompany"
          name="productionCompany"
          type="text"
          value={value}
          placeholder="Nombre de la productora"
          autoComplete="off"
          disabled={disabled}
          onFocus={openList}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false)
            }
          }}
          onChange={(event) => {
            onChange('productionCompany', event.target.value)
            openList()
          }}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className={`${compact ? 'min-h-11 rounded-xl px-3.5 pr-11' : 'min-h-12 rounded-2xl px-4 pr-12'} w-full min-w-0 border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            hasError
              ? 'border-red-300 focus:ring-red-300'
              : 'border-white/12 hover:bg-white/8'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.18em] ${
            selectedCompany ? 'text-brand-300' : 'text-brand-100/36'
          }`}
        >
          {selectedCompany ? 'OK' : ''}
        </span>
        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 min-w-0 overflow-hidden rounded-[1rem] border border-white/10 bg-[#171412] shadow-[0_18px_48px_rgba(0,0,0,0.4)]">
            <div className="max-h-56 overflow-y-auto p-1.5">
              {isLoadingCompanies ? (
                <p className="px-3 py-2.5 text-xs text-brand-100/58">
                  Cargando productoras...
                </p>
              ) : companiesError ? (
                <p className="px-3 py-2.5 text-xs text-brand-100/58">
                  {companiesError}
                </p>
              ) : filteredCompanies.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-brand-100/58">
                  Sin coincidencias
                </p>
              ) : (
                filteredCompanies.map((company) => {
                  const isSelected = company.id === selectedCompanyId

                  return (
                    <button
                      key={company.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                      }}
                      onClick={() => {
                        onChange('productionCompany', company.name)
                        onChange('productionCompanyId', company.id)
                        setIsOpen(false)
                      }}
                      className={`flex w-full min-w-0 items-center gap-2.5 rounded-[0.85rem] px-2.5 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'bg-brand-300/16 text-brand-100'
                          : 'text-brand-100/82 hover:bg-white/8'
                      }`}
                    >
                      {company.logoUrl ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/6 ring-1 ring-white/10">
                          <img
                            src={company.logoUrl}
                            alt=""
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </span>
                      ) : (
                        <span className="h-6 w-6 shrink-0 rounded-md bg-white/6 ring-1 ring-white/10" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{company.name}</span>
                      {isSelected ? (
                        <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.18em] text-brand-300">
                          Seleccionada
                        </span>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
      {hasError ? (
        <p id={errorId} className="mt-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </>
  )
}

export function SelectionPdfForm({
  values,
  errors,
  onChange,
  disabled = false,
  readOnlyFields = [],
  variant = 'default',
  columns = 1,
  showTentativeDates = true,
  desktopMessageSplit = false,
}: SelectionPdfFormProps) {
  const isCompact = variant === 'compact'
  const useTwoColumns = columns === 2
  const readOnlyFieldSet = useMemo(() => new Set(readOnlyFields), [readOnlyFields])
  const visibleFields = showTentativeDates
    ? fields
    : fields.filter(
        (field) =>
          field.name !== 'tentativeStartDate' && field.name !== 'tentativeEndDate',
      )

  if (useTwoColumns && desktopMessageSplit) {
    const leftColumnFields = visibleFields.filter((field) => field.name !== 'message')
    const messageField = visibleFields.find((field) => field.name === 'message')

    return (
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className={isCompact ? 'grid gap-x-4 gap-y-3 sm:grid-cols-2' : 'grid gap-x-4 gap-y-4 sm:grid-cols-2'}>
          {leftColumnFields.map((field) => {
            const errorId = `${field.name}-error`
            const hasError = Boolean(errors[field.name])
            const isDateField = field.type === 'date'
            const isReadOnly = readOnlyFieldSet.has(field.name)
            const fieldValue = (
              typeof values[field.name] === 'string' ? values[field.name] : ''
            ) as string
            const min =
              field.name === 'tentativeEndDate' && values.tentativeStartDate
                ? values.tentativeStartDate
                : undefined

            return (
              <div key={field.name}>
                {isReadOnly ? (
                  <StaticField
                    label={field.label}
                    value={getStaticFieldValue(field.name, fieldValue)}
                    compact={isCompact}
                  />
                ) : field.name === 'productionCompany' ? (
                  <ProductionCompanyField
                    value={values.productionCompany}
                    selectedCompanyId={values.productionCompanyId}
                    error={errors.productionCompany}
                    disabled={disabled}
                    compact={isCompact}
                    onChange={onChange}
                  />
                ) : isDateField ? (
                  <DateInputWithVisualShell
                    id={field.name}
                    name={field.name}
                    label={field.label}
                    value={fieldValue}
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
                      value={fieldValue}
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

        {messageField ? (
          <div className="flex flex-col">
            {readOnlyFieldSet.has(messageField.name) ? (
              <StaticField
                label={messageField.label}
                value={getStaticFieldValue(messageField.name, values.message)}
                compact={isCompact}
                multiline
              />
            ) : (
              <>
                <label
                  htmlFor={messageField.name}
                  className="mb-2 block text-sm font-medium text-brand-100"
                >
                  {messageField.label}
                </label>
                <textarea
                  id={messageField.name}
                  name={messageField.name}
                  value={values.message}
                  placeholder={messageField.placeholder}
                  disabled={disabled}
                  rows={isCompact ? 5 : 6}
                  onChange={(event) => {
                    onChange(messageField.name, event.target.value)
                  }}
                  aria-invalid={Boolean(errors[messageField.name])}
                  aria-describedby={errors[messageField.name] ? `${messageField.name}-error` : undefined}
                  className={`${isCompact ? 'rounded-xl px-3.5 py-3' : 'rounded-2xl px-4 py-3'} w-full border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/40 focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    errors[messageField.name]
                      ? 'border-red-300 focus-visible:ring-red-300'
                      : 'border-white/12'
                  }`}
                />
              </>
            )}
            {errors[messageField.name] ? (
              <p id={`${messageField.name}-error`} className="mt-2 text-sm text-red-200">
                {errors[messageField.name]}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

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
        const isTextareaField = field.type === 'textarea'
        const isReadOnly = readOnlyFieldSet.has(field.name)
        const fieldValue = (
          typeof values[field.name] === 'string' ? values[field.name] : ''
        ) as string
        const min =
          field.name === 'tentativeEndDate' && values.tentativeStartDate
            ? values.tentativeStartDate
            : undefined

        return (
          <div
            key={field.name}
            className={isTextareaField && useTwoColumns ? 'sm:col-span-2' : undefined}
          >
            {isReadOnly ? (
              <StaticField
                label={field.label}
                value={getStaticFieldValue(field.name, fieldValue)}
                compact={isCompact}
                multiline={isTextareaField}
              />
            ) : field.name === 'productionCompany' ? (
              <ProductionCompanyField
                value={values.productionCompany}
                selectedCompanyId={values.productionCompanyId}
                error={errors.productionCompany}
                disabled={disabled}
                compact={isCompact}
                onChange={onChange}
              />
            ) : isDateField ? (
              <DateInputWithVisualShell
                id={field.name}
                name={field.name}
                label={field.label}
                value={fieldValue}
                error={errors[field.name]}
                disabled={disabled}
                min={min}
                compact={isCompact}
                onChange={onChange}
              />
            ) : isTextareaField ? (
              <>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm font-medium text-brand-100"
                >
                  {field.label}
                </label>
                <textarea
                  id={field.name}
                  name={field.name}
                  value={fieldValue}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  rows={isCompact ? 5 : 6}
                  onChange={(event) => {
                    onChange(field.name, event.target.value)
                  }}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  className={`${isCompact ? 'rounded-xl px-3.5 py-3' : 'rounded-2xl px-4 py-3'} w-full border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/40 focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    hasError
                      ? 'border-red-300 focus-visible:ring-red-300'
                      : 'border-white/12'
                  }`}
                />
              </>
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
                  value={fieldValue}
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
