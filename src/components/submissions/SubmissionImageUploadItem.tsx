import type { SubmissionImageItem } from '@/hooks/useSubmissionImages.ts'

type SubmissionImageUploadItemProps = {
  item: SubmissionImageItem
  compactRow?: boolean
  disabled?: boolean
  onRemove: (itemId: string) => void
  onRetry?: (item: SubmissionImageItem) => void
  overflowCount?: number
}

export function SubmissionImageUploadItem({
  item,
  compactRow = false,
  disabled = false,
  onRemove,
  onRetry,
  overflowCount = 0,
}: SubmissionImageUploadItemProps) {
  const isError = item.status === 'error'
  const isUploading = item.status === 'uploading'

  return (
    <article
      className={`group relative overflow-hidden border border-white/10 bg-white/6 ${
        compactRow
          ? 'aspect-[4/3] w-[calc(25%-0.5625rem)] min-w-[120px] shrink-0 rounded-[0.3rem]'
          : 'aspect-video rounded-[0.75rem]'
      }`}
    >
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

      {overflowCount > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/58 text-[1.75rem] font-semibold tracking-[-0.04em] text-white backdrop-blur-[1px] sm:text-[2rem]">
          +{overflowCount}
        </div>
      ) : null}
    </article>
  )
}
