import { useEffect, useState } from 'react'

import logoUrl from '../../../logo.webp'
import type { SelectionPdfPayload } from '@/types/selection-pdf.ts'

type SelectionPdfPreviewProps = {
  payload: SelectionPdfPayload
  hideCover?: boolean
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
  hideCover = false,
}: SelectionPdfPreviewProps) {
  const [isProductionLogoVisible, setIsProductionLogoVisible] = useState(
    Boolean(payload.project.productionCompanyLogoUrl),
  )
  const [isProductLogoVisible, setIsProductLogoVisible] = useState(
    Boolean(payload.project.productLogoUrl),
  )
  const coverDetails = [
    ['Producto', payload.project.product],
    ['Productora', payload.project.productionCompany],
  ] as const
  const hasProductionLogo = Boolean(payload.project.productionCompanyLogoUrl)
  const showProductionLogo = hasProductionLogo && isProductionLogoVisible
  const hasProductLogo = Boolean(payload.project.productLogoUrl)
  const showProductLogo = hasProductLogo && isProductLogoVisible

  useEffect(() => {
    setIsProductionLogoVisible(hasProductionLogo)
  }, [hasProductionLogo, payload.project.productionCompanyLogoUrl])

  useEffect(() => {
    setIsProductLogoVisible(hasProductLogo)
  }, [hasProductLogo, payload.project.productLogoUrl])

  const locationPages = payload.locations.flatMap((location) =>
    buildLocationPages(location),
  )

  return (
    <div className="space-y-6">
      {!hideCover ? (
        <section className="mx-auto aspect-[210/297] w-full max-w-[900px] border border-[#e2dcd3]/55 bg-[#080808] px-[11.4%] py-[6.1%] text-[#f8f4ee] shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
          <div className="flex h-full flex-col">
            <div
              className={`flex items-center justify-center ${
                showProductionLogo ? 'gap-8' : ''
              }`}
            >
              <img
                src={logoUrl}
                alt="Logo"
                className={`h-auto object-contain ${
                  showProductionLogo
                    ? 'max-h-[9rem] w-full max-w-[18rem]'
                    : 'max-h-[24rem] w-full max-w-[40rem]'
                }`}
              />
              {showProductionLogo ? (
                <img
                  src={payload.project.productionCompanyLogoUrl ?? undefined}
                  alt={payload.project.productionCompany.trim() || 'Productora'}
                  className="h-auto max-h-[9rem] w-full max-w-[18rem] object-contain"
                  onError={() => {
                    setIsProductionLogoVisible(false)
                  }}
                />
              ) : null}
            </div>

            <div className="mt-12 space-y-4">
              {coverDetails.map(([label, value]) => (
                <div key={label} className="text-center">
                  {label === 'Producto' && showProductLogo ? (
                    <img
                      src={payload.project.productLogoUrl ?? undefined}
                      alt={payload.project.product.trim() || 'Producto'}
                      className="mx-auto mb-3 h-auto max-h-[3.75rem] max-w-[14rem] object-contain"
                      onError={() => {
                        setIsProductLogoVisible(false)
                      }}
                    />
                  ) : null}
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
      ) : null}

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
                      className="relative min-h-0 flex-1 overflow-hidden bg-black/20"
                    >
                      <div className="absolute inset-3 flex min-h-0 items-center justify-center overflow-hidden">
                        <img
                          src={image.imageUrl}
                          alt={`Imagen seleccionada de ${location.locationCode}`}
                          loading="lazy"
                          className="block h-full w-full object-contain object-center"
                        />
                      </div>
                    </div>
                  ))}

                  {images.length === 1 ? (
                    <div className="flex min-h-0 flex-1 bg-black/20" />
                  ) : null}
                </div>

                <div className="mt-4 pt-2 text-center text-sm text-[#d7c0a2]">
                  {locationPageIndex + (hideCover ? 1 : 2)}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
