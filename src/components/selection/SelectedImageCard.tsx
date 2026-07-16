import type { SelectedLocationImage } from '@/types/image-selection.ts'

type SelectedImageCardProps = {
  image: SelectedLocationImage
  onRemove: (key: string) => void
}

export function SelectedImageCard({
  image,
  onRemove,
}: SelectedImageCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[1rem] border border-white/10 bg-white/6">
      <div
        className="aspect-[4/3] bg-cover bg-center"
        style={{ backgroundImage: `url(${image.imageUrl})` }}
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <span className="rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
          {image.sortOrder ?? 'Img'}
        </span>
        <button
          type="button"
          onClick={() => {
            onRemove(image.key)
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/65 text-lg text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          aria-label={`Quitar imagen de ${image.locationCode}`}
        >
          ×
        </button>
      </div>
    </div>
  )
}
