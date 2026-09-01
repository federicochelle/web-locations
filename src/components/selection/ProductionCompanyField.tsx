import { useId, useRef, useState } from 'react'

export type ProductionCompanyFieldUploadStatus = 'idle' | 'uploading' | 'error'

type ProductionCompanyFieldProps = {
  value: string
  logoUrl: string | null
  label?: string
  placeholder?: string
  autoComplete?: string
  uploadLabel?: string
  error?: string
  uploadError?: string | null
  uploadStatus?: ProductionCompanyFieldUploadStatus
  disabled: boolean
  compact: boolean
  inputId?: string
  onValueChange: (value: string) => void
  onLogoFileSelect?: (file: File) => void | Promise<void>
}

function UploadSpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  )
}

export function ProductionCompanyField({
  value,
  logoUrl,
  label = 'Productora',
  placeholder = 'Nombre de la productora',
  autoComplete = 'off',
  uploadLabel = 'logo de la productora',
  error,
  uploadError = null,
  uploadStatus = 'idle',
  disabled,
  compact,
  inputId = 'productionCompany',
  onValueChange,
  onLogoFileSelect,
}: ProductionCompanyFieldProps) {
  const fileInputId = useId()
  const errorId = `${inputId}-error`
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mergedError = error || uploadError || undefined
  const hasError = Boolean(mergedError)
  const isUploading = uploadStatus === 'uploading'
  const normalizedLogoUrl = logoUrl?.trim() || null
  const hasLogo = Boolean(normalizedLogoUrl)
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const showLogoThumbnail = hasLogo && failedLogoUrl !== normalizedLogoUrl

  function openFilePicker() {
    if (disabled || isUploading || !onLogoFileSelect) {
      return
    }

    fileInputRef.current?.click()
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-brand-100"
      >
        {label}
      </label>
      <div className="relative min-w-0">
        <input
          id={inputId}
          name={inputId}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => {
            onValueChange(event.target.value)
          }}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`${compact ? 'min-h-11 rounded-xl px-3.5 pr-12' : 'min-h-12 rounded-2xl px-4 pr-14'} w-full min-w-0 border bg-white/6 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            hasError
              ? 'border-red-300 focus:ring-red-300'
              : 'border-white/12 hover:bg-white/8'
          }`}
        />
        <button
          type="button"
          onClick={openFilePicker}
          disabled={disabled || isUploading || !onLogoFileSelect}
          aria-label={hasLogo ? `Reemplazar ${uploadLabel}` : `Cargar ${uploadLabel}`}
          title={hasLogo ? `Reemplazar ${uploadLabel}` : `Cargar ${uploadLabel}`}
          aria-controls={fileInputId}
          className={`absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/6 text-brand-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            showLogoThumbnail ? 'text-brand-300' : 'text-brand-100/82'
          }`}
        >
          {isUploading ? (
            <UploadSpinnerIcon />
          ) : showLogoThumbnail ? (
            <img
              src={normalizedLogoUrl ?? undefined}
              alt=""
              className="h-7 w-7 rounded-md object-contain"
              onError={() => {
                setFailedLogoUrl(normalizedLogoUrl)
              }}
            />
          ) : (
            <span className="text-lg leading-none">+</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void onLogoFileSelect?.(file)
            }

            event.target.value = ''
          }}
        />
      </div>
      {hasError ? (
        <p id={errorId} className="mt-2 text-sm text-red-200">
          {mergedError}
        </p>
      ) : null}
    </div>
  )
}
