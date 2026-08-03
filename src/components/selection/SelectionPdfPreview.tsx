import logoUrl from '../../../logo.webp'
import type { SelectionPdfPayload } from '@/types/selection-pdf.ts'

type SelectionPdfPreviewProps = {
  payload: SelectionPdfPayload
}

function getPreviewValue(value: string) {
  return value.trim().length > 0 ? value : '—'
}

function formatLocationCode(value: string) {
  return value.replace(/-/g, ' ')
}

function chunkLocationImages(images: SelectionPdfPayload['locations'][number]['images']) {
  const chunks: typeof images[] = []

  for (let index = 0; index < images.length; index += 2) {
    chunks.push(images.slice(index, index + 2))
  }

  return chunks
}

function buildLocationPages(location: SelectionPdfPayload['locations'][number]) {
  return chunkLocationImages(location.images).map((imagesChunk, index) => ({
    location,
    images: imagesChunk,
    isFirstPage: index === 0,
  }))
}

export function SelectionPdfPreview({
  payload,
}: SelectionPdfPreviewProps) {
  const coverDetails = [
    ['Producto', payload.project.product],
    ['Productora', payload.project.productionCompany],
  ] as const

  const locationPages = payload.locations.flatMap((location) =>
    buildLocationPages(location),
  )

  return (
    <div className="space-y-6">
      <section className="mx-auto aspect-[210/297] w-full max-w-[900px] border border-[#e2dcd3]/55 bg-[#080808] px-[11.4%] py-[6.1%] text-[#f8f4ee] shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="flex h-full flex-col">
          <div className="flex justify-center">
            <img
              src={logoUrl}
              alt="Logo"
              className="h-auto max-h-[24rem] w-full max-w-[40rem] object-contain"
            />
          </div>

          <div className="mt-12 space-y-4">
            {coverDetails.map(([label, value]) => (
              <div key={label} className="text-center">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#d7c0a2]">
                  {label}
                </p>
                <p className="mt-2 text-[1.35rem] leading-[1.35] text-[#d7c0a2] sm:text-[1.55rem]">
                  {getPreviewValue(value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 text-center text-sm text-[#d7c0a2]">1</div>
        </div>
      </section>

      <div className="space-y-6">
        {locationPages.map(({ location, images, isFirstPage }, locationPageIndex) => {
          const showTitle =
            location.locationTitle.trim().length > 0 &&
            location.locationTitle !== location.locationCode

          return (
            <section
              key={`${location.locationId}-${locationPageIndex}`}
              className="mx-auto aspect-[210/297] w-full max-w-[900px] border border-[#e2dcd3]/55 bg-[#080808] px-[7.6%] py-[5.4%] text-[#f8f4ee] shadow-[0_28px_80px_rgba(0,0,0,0.28)]"
            >
              <div className="flex h-full flex-col">
                {isFirstPage ? (
                  <div className="text-center">
                    <h4 className="font-display text-[2.8rem] font-semibold leading-none tracking-[-0.03em] text-[#d7c0a2] sm:text-[3.4rem]">
                      {formatLocationCode(location.locationCode)}
                    </h4>
                    {showTitle ? (
                      <p className="mt-3 text-[1rem] text-[#d7c0a2]">{location.locationTitle}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className={`flex flex-1 flex-col gap-4 ${isFirstPage ? 'mt-10' : 'mt-6'}`}>
                  {images.map((image) => (
                    <div
                      key={image.key}
                      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/20 p-3"
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Imagen seleccionada de ${location.locationCode}`}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ))}

                  {images.length === 1 ? (
                    <div className="flex min-h-0 flex-1 bg-black/20" />
                  ) : null}
                </div>

                <div className="mt-4 pt-2 text-center text-sm text-[#d7c0a2]">
                  {locationPageIndex + 2}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
