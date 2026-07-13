import { MAX_SUBMISSION_IMAGES } from '@/services/submission-images.service.ts'

import { SubmissionImageUploadItem } from '@/components/submissions/SubmissionImageUploadItem.tsx'
import type { SubmissionImageItem } from '@/hooks/useSubmissionImages.ts'

type SubmissionImagesFieldProps = {
  items: SubmissionImageItem[]
  selectionError: string | null
  disabled?: boolean
  onFilesSelected: (files: FileList | File[]) => void
  onRemove: (itemId: string) => void
}

export function SubmissionImagesField({
  items,
  selectionError,
  disabled = false,
  onFilesSelected,
  onRemove,
}: SubmissionImagesFieldProps) {
  const canAddMore = items.length < MAX_SUBMISSION_IMAGES

  function handleRetry(item: SubmissionImageItem) {
    onRemove(item.id)
    onFilesSelected([item.file])
  }

  return (
    <section className="space-y-5">
      <h3 className="text-lg font-semibold text-brand-100">Fotografias</h3>

      {items.length === 0 ? (
        <label className="flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-[1rem] border border-dashed border-white/16 bg-white/6 px-4 py-10 text-center transition hover:border-brand-300 hover:bg-white/8">
          <span className="text-5xl text-brand-300/88" aria-hidden="true">
            📷
          </span>
          <span className="mt-4 text-base font-medium text-brand-100">
            Seleccionar imagenes
          </span>
          <span className="mt-2 text-sm text-brand-100/68">
            Arrastra las imagenes aqui o hace clic para seleccionarlas.
          </span>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              if (event.target.files) {
                onFilesSelected(event.target.files)
                event.target.value = ''
              }
            }}
          />
        </label>
      ) : null}

      {selectionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {selectionError}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-brand-100/68">
            {items.length} de {MAX_SUBMISSION_IMAGES} imagenes
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <SubmissionImageUploadItem
                key={item.id}
                item={item}
                disabled={disabled}
                onRemove={onRemove}
                onRetry={handleRetry}
              />
            ))}

            {canAddMore ? (
              <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-[0.75rem] border border-dashed border-white/16 bg-white/6 px-4 text-center transition hover:border-brand-300 hover:bg-white/8">
                <span className="text-4xl text-brand-300/88" aria-hidden="true">
                  +
                </span>
                <span className="mt-3 text-sm font-medium text-brand-100">
                  Agregar imagenes
                </span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  disabled={disabled}
                  onChange={(event) => {
                    if (event.target.files) {
                      onFilesSelected(event.target.files)
                      event.target.value = ''
                    }
                  }}
                />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
