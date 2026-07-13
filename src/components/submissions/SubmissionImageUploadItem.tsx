import type { SubmissionImageItem } from '@/hooks/useSubmissionImages.ts'

type SubmissionImageUploadItemProps = {
  item: SubmissionImageItem
  disabled?: boolean
  onRemove: (itemId: string) => void
  onRetry?: (item: SubmissionImageItem) => void
}

export function SubmissionImageUploadItem({
  item,
  disabled = false,
  onRemove,
  onRetry,
}: SubmissionImageUploadItemProps) {
  const isError = item.status === 'error'
  const isUploading = item.status === 'uploading'

  return (
    <article className="group relative aspect-video overflow-hidden rounded-[0.75rem] border border-white/10 bg-white/6">
      <img
        src={item.previewUrl}
        alt={item.file.name}
        className="h-full w-full object-cover"
      />

      <div
        className={`absolute inset-0 transition ${
          isError
            ? 'bg-red-900/26'
            : 'bg-black/0 md:group-hover:bg-black/35'
        }`}
      />

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/55 text-lg text-white transition hover:bg-black/72 disabled:cursor-not-allowed disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100"
        aria-label={`Quitar ${item.file.name}`}
      >
        ×
      </button>

      {isError && onRetry ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={() => onRetry(item)}
            disabled={disabled}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-black/60 px-4 text-sm font-medium text-white transition hover:bg-black/76 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {isUploading ? (
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/10">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      ) : null}
    </article>
  )
}
