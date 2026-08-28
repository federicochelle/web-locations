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

function ImagePlaceholderIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-12 w-12 text-brand-300/88"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m20.5 15-4.5-4.5a1 1 0 0 0-1.4 0L8 17" />
      <path d="m11.5 17 2.5-2.5a1 1 0 0 1 1.4 0l2.1 2.1" />
    </svg>
  )
}

export function SubmissionImagesField({
  items,
  selectionError,
  disabled = false,
  onFilesSelected,
  onRemove,
}: SubmissionImagesFieldProps) {
  const canAddMore = items.length < MAX_SUBMISSION_IMAGES
  const visibleItems = items.slice(0, 4)
  const hiddenItemsCount = Math.max(0, items.length - visibleItems.length)

  function handleRetry(item: SubmissionImageItem) {
    onRemove(item.id)
    onFilesSelected([item.file])
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-brand-100">Fotografías</h3>

        {items.length > 0 && canAddMore ? (
          <label className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-300 focus-within:ring-offset-2 focus-within:ring-offset-[#14110f]">
            Agregar imágenes
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

      {items.length === 0 ? (
        <label className="flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-[1rem] border border-dashed border-white/16 bg-white/6 px-4 py-10 text-center transition hover:border-brand-300 hover:bg-white/8">
          <ImagePlaceholderIcon />
          <span className="mt-4 text-base font-medium text-brand-100">
            Seleccionar imagenes
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
        <div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {visibleItems.map((item, index) => (
              <SubmissionImageUploadItem
                key={item.id}
                item={item}
                compactRow
                disabled={disabled}
                onRemove={onRemove}
                onRetry={handleRetry}
                overflowCount={
                  index === visibleItems.length - 1
                    ? hiddenItemsCount
                    : 0
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
