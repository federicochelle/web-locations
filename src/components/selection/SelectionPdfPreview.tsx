import type { SelectionPdfPayload } from '@/types/selection-pdf.ts'

type SelectionPdfPreviewProps = {
  payload: SelectionPdfPayload
}

function formatPreviewDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getPreviewValue(value: string) {
  return value.trim().length > 0 ? value : '—'
}

export function SelectionPdfPreview({
  payload,
}: SelectionPdfPreviewProps) {
  const previewTitle = payload.project.product.trim()

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mt-2 min-h-[3rem] font-display text-3xl font-semibold tracking-[-0.03em] text-brand-100">
          {previewTitle}
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Productora</p>
            <p className="mt-2 text-sm text-brand-100">
              {getPreviewValue(payload.project.productionCompany)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">
              Jefe de locaciones
            </p>
            <p className="mt-2 text-sm text-brand-100">
              {getPreviewValue(payload.project.locationManager)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Email</p>
            <p className="mt-2 text-sm text-brand-100">
              {getPreviewValue(payload.project.email)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Fecha</p>
            <p className="mt-2 text-sm text-brand-100">
              {formatPreviewDate(payload.generatedAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {payload.locations.map((location) => {
          const showTitle =
            location.locationTitle.trim().length > 0 &&
            location.locationTitle !== location.locationCode

          return (
            <section key={location.locationId} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                    {location.locationCode}
                  </h4>
                  {showTitle ? (
                    <p className="mt-2 text-sm text-brand-300">{location.locationTitle}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-white/6 px-3 py-1.5 text-sm text-brand-100">
                  {location.images.length}{' '}
                  {location.images.length === 1 ? 'imagen' : 'imagenes'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {location.images.map((image) => (
                  <div key={image.key} className="overflow-hidden border border-white/10">
                    <img
                      src={image.imageUrl}
                      alt={`Imagen seleccionada de ${location.locationCode}`}
                      loading="lazy"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
