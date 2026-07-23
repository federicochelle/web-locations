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

  const isSelectDisabled = disabled || isLoading

  return (
    <label className="mt-3 block min-w-0">
      <div
        className={`relative ${
          compact ? 'max-w-[220px]' : 'max-w-[260px]'
        }`}
      >
        <select
          value={activeProjectId ?? ''}
          onChange={handleChange}
          disabled={isSelectDisabled}
          aria-label="Proyecto activo"
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            color: compact ? 'var(--color-brand-100)' : undefined,
            WebkitTextFillColor: compact ? 'var(--color-brand-100)' : undefined,
          }}
          className={`min-h-11 w-full appearance-none border bg-transparent px-3.5 pr-11 text-sm outline-none shadow-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            compact
              ? 'rounded-full border-white/8 bg-white/[0.045] text-brand-100 hover:bg-white/[0.07]'
              : 'rounded-xl border-white/10 bg-white/6 text-brand-100 hover:bg-white/10'
          }`}
        >
          <option value="">Nuevo</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
            isSelectDisabled ? 'text-brand-100/35' : 'text-brand-100/72'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M5.22 7.97a.75.75 0 0 1 1.06 0L10 11.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.03a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </label>
  )
}
