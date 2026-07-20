import { useNavigate } from 'react-router-dom'

import {
  RequestProjectForm,
  type RequestProjectFormValues,
} from '@/components/requests/RequestProjectForm.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'

export function NewRequestProjectPage() {
  usePageTitle('Nuevo proyecto')

  const navigate = useNavigate()
  const { createProject, error, isCreating } = useRequestProjects()

  async function handleSubmit(values: RequestProjectFormValues) {
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
            <RequestProjectForm
              error={error}
              isSubmitting={isCreating}
              cancelLabel="Volver"
              onCancel={() => {
                navigate('/requests')
              }}
              onSubmit={handleSubmit}
            />
          </section>
        </section>
      </div>
    </div>
  )
}
