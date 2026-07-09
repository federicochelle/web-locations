import type { SubmissionImageItem } from '@/hooks/useSubmissionImages.ts'

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusLabel(item: SubmissionImageItem) {
  switch (item.status) {
    case 'pending':
      return 'Lista para subir'
    case 'uploading':
      return 'Subiendo...'
    case 'uploaded':
      return 'Subida'
    case 'error':
      return item.error ? 'Con error' : 'No subida'
    default:
      return ''
  }
}

function getStatusStyles(item: SubmissionImageItem) {
  switch (item.status) {
    case 'uploaded':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'uploading':
      return 'border-sky-200 bg-sky-50 text-sky-800'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    default:
      return 'border-sand-200 bg-sand-50 text-sand-700'
  }
}

type SubmissionImageUploadItemProps = {
  item: SubmissionImageItem
  disabled?: boolean
  onRemove: (itemId: string) => void
}

export function SubmissionImageUploadItem({
  item,
  disabled = false,
  onRemove,
}: SubmissionImageUploadItemProps) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white">
      <div className="grid gap-4 p-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:p-5">
        <div className="overflow-hidden rounded-[1.25rem] bg-sand-100">
          <img
            src={item.previewUrl}
            alt={item.file.name}
            className="aspect-square h-full w-full object-cover"
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-brand-950">{item.file.name}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-sand-700">
                {formatFileSize(item.file.size)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyles(item)}`}
              >
                {getStatusLabel(item)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm text-brand-950 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Quitar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-sand-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <p className="text-xs text-sand-700">{item.progress}% completado</p>
          </div>

          {item.error ? <p className="text-sm text-red-900">{item.error}</p> : null}
        </div>
      </div>
    </article>
  )
}
