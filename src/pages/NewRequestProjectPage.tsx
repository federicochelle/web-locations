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
  usePageTitle('Nuevo proyecto')

  const navigate = useNavigate()
  const { createProject, error, isCreating } = useRequestProjects()
  const [values, setValues] = useState<ProjectFormValues>(INITIAL_VALUES)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values.title.trim()) {
      setValidationError('Ingresa un titulo para tu proyecto.')
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
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-5xl space-y-8 sm:space-y-10">
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
              Nuevo proyecto
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Crea un proyecto para organizar las locaciones que quieras consultar.
            </p>
          </div>

          <section className="rounded-[1rem] border border-white/8 bg-[#1B1B1D] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6 lg:p-7">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              {validationError ? (
                <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {validationError}
                </div>
              ) : null}

              <label className="block space-y-2.5">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
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
                  className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                  placeholder="Ej. Campana exterior de verano"
                  disabled={isCreating}
                />
              </label>

              <label className="block space-y-2.5">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
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
                  className="w-full rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                  placeholder="Resume el tipo de proyecto, estilo buscado o informacion general que quieras compartir."
                  disabled={isCreating}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  to="/requests"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6"
                >
                  Volver
                </Link>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? 'Creando proyecto...' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>
    </div>
  )
}
