import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'

type ProjectFormValues = {
  title: string
  message: string
}

const INITIAL_VALUES: ProjectFormValues = {
  title: '',
  message: '',
}

export function NewRequestProjectPage() {
  usePageTitle('Nueva solicitud')

  const navigate = useNavigate()
  const { createProject, error, isCreating } = useRequestProjects()
  const [values, setValues] = useState<ProjectFormValues>(INITIAL_VALUES)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values.title.trim()) {
      setValidationError('Ingresa un titulo para tu solicitud.')
      return
    }

    setValidationError(null)

    const project = await createProject(values)

    if (project) {
      navigate(`/requests/${project.id}`)
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto flex max-w-[1720px] justify-center">
        <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
                Solicitudes
              </p>
              <div className="space-y-2">
                <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                  Nueva solicitud
                </h1>
                <p className="text-sm leading-6 text-sand-700 sm:text-base">
                  Crea un proyecto de solicitud para organizar las locaciones que quieras consultar.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {error}
                </div>
              ) : null}

              {validationError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {validationError}
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Titulo
                </span>
                <input
                  type="text"
                  value={values.title}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                    setValidationError(null)
                  }}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Ej. Campana exterior de verano"
                  disabled={isCreating}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Mensaje
                </span>
                <textarea
                  value={values.message}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }}
                  rows={6}
                  className="w-full rounded-[1.5rem] border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Resume el tipo de proyecto, estilo buscado o informacion general que quieras compartir."
                  disabled={isCreating}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  to="/requests"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 text-sm font-medium text-brand-950 transition hover:bg-sand-50"
                >
                  Volver
                </Link>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? 'Creando solicitud...' : 'Crear solicitud'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
