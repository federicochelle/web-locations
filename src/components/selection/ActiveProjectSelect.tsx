import type { ChangeEvent } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

type ActiveProjectSelectProps = {
  activeProjectId: string | null
  projects: RequestProject[]
  isLoading?: boolean
  disabled?: boolean
  compact?: boolean
  onChange: (projectId: string | null) => void
}

export function ActiveProjectSelect({
  activeProjectId,
  projects,
  isLoading = false,
  disabled = false,
  compact = false,
  onChange,
}: ActiveProjectSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    onChange(value ? value : null)
  }

  return (
    <label className="mt-3 block min-w-0">
      <select
        value={activeProjectId ?? ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        aria-label="Proyecto activo"
        className={`min-h-11 w-full border px-3.5 text-sm text-brand-100 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
          compact
            ? 'max-w-[220px] rounded-full border-white/8 bg-white/[0.045] text-brand-200'
            : 'max-w-[260px] border-white/10 bg-white/6'
        }`}
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
