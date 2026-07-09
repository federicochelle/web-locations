import {
  MAX_SUBMISSION_IMAGE_SIZE_BYTES,
  MAX_SUBMISSION_IMAGES,
} from '@/services/submission-images.service.ts'

import { SubmissionImageUploadItem } from '@/components/submissions/SubmissionImageUploadItem.tsx'
import type { SubmissionImageItem } from '@/hooks/useSubmissionImages.ts'

function formatMaxSize(size: number) {
  return `${Math.round(size / (1024 * 1024))} MB`
}

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
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-black/5 bg-sand-50 px-4 py-5 sm:px-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
          Imagenes de evaluacion
        </p>
        <p className="text-sm leading-6 text-sand-700">
          Puedes adjuntar hasta {MAX_SUBMISSION_IMAGES} imagenes. Formatos: JPG, PNG,
          WEBP o AVIF. Maximo {formatMaxSize(MAX_SUBMISSION_IMAGE_SIZE_BYTES)} por imagen.
        </p>
      </div>

      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-sand-400 bg-white px-4 py-6 text-center transition hover:border-brand-300 hover:bg-sand-50">
        <span className="text-sm font-medium text-brand-950">
          Seleccionar imagenes
        </span>
        <span className="mt-2 text-sm text-sand-700">
          Elige archivos desde tu dispositivo para acompanar la postulacion.
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

      {selectionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {selectionError}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <SubmissionImageUploadItem
              key={item.id}
              item={item}
              disabled={disabled}
              onRemove={onRemove}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
