import type { ChangeEvent } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

type ActiveProjectSelectProps = {
  activeProjectId: string | null
  projects: RequestProject[]
  isLoading?: boolean
  disabled?: boolean
  onChange: (projectId: string | null) => void
}

export function ActiveProjectSelect({
  activeProjectId,
  projects,
  isLoading = false,
  disabled = false,
  onChange,
}: ActiveProjectSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    onChange(value ? value : null)
  }

  return (
    <label className="block min-w-0">
      <select
        value={activeProjectId ?? ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        aria-label="Proyecto activo"
        className="min-h-11 w-full max-w-[260px] border border-white/10 bg-white/6 px-3.5 text-sm text-brand-100 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="">Nuevo proyecto</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>
    </label>
  )
}
