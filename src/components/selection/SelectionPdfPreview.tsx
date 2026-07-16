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

export function SelectionPdfPreview({
  payload,
}: SelectionPdfPreviewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-white/10 bg-white/4 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">
          Preview
        </p>
        <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-brand-100">
          Seleccion de locaciones
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Producto</p>
            <p className="mt-2 text-sm text-brand-100">{payload.project.product}</p>
          </div>
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Productora</p>
            <p className="mt-2 text-sm text-brand-100">
              {payload.project.productionCompany}
            </p>
          </div>
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">
              Jefe de locaciones
            </p>
            <p className="mt-2 text-sm text-brand-100">
              {payload.project.locationManager}
            </p>
          </div>
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Email</p>
            <p className="mt-2 text-sm text-brand-100">{payload.project.email}</p>
          </div>
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Fecha</p>
            <p className="mt-2 text-sm text-brand-100">
              {formatPreviewDate(payload.generatedAt)}
            </p>
          </div>
          <div className="rounded-[1rem] bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Resumen</p>
            <p className="mt-2 text-sm text-brand-100">
              {payload.totalLocations} {payload.totalLocations === 1 ? 'locacion' : 'locaciones'} y{' '}
              {payload.totalImages} {payload.totalImages === 1 ? 'imagen' : 'imagenes'}
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
            <section
              key={location.locationId}
              className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4"
            >
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

              <div className="mt-4 grid grid-cols-2 gap-3">
                {location.images.map((image) => (
                  <div
                    key={image.key}
                    className="overflow-hidden rounded-[1rem] border border-white/10 bg-white/6"
                  >
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
