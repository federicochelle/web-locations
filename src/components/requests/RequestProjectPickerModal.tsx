import type { RequestProject } from '@/types/request-project.ts'

type RequestProjectPickerModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  projects: RequestProject[]
  onClose: () => void
  onSelect: (projectId: string) => Promise<void>
}

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function RequestProjectPickerModal({
  isOpen,
  isSubmitting,
  projects,
  onClose,
  onSelect,
}: RequestProjectPickerModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
            Solicitudes
          </p>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
              Elegir solicitud
            </h2>
            <p className="text-sm leading-6 text-sand-700 sm:text-base">
              Selecciona en qué proyecto borrador quieres agregar esta locación.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-5 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-950">
                    {project.title}
                  </h3>
                  <p className="text-sm text-sand-700">
                    Actualizada el {formatProjectDate(project.updatedAt)}
                  </p>
                  <p className="text-sm text-sand-700">
                    {project.locationCount} locacion{project.locationCount === 1 ? '' : 'es'} asociada{project.locationCount === 1 ? '' : 's'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void onSelect(project.id)
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Agregando...' : 'Seleccionar'}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 text-sm font-medium text-brand-950 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
