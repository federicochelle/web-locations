import type { ChangeEvent } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

const NEW_PROJECT_OPTION_VALUE = '__new__'
const PLACEHOLDER_OPTION_VALUE = '__placeholder__'

type ActiveProjectSelectProps = {
  activeProjectId: string | null
  projects: RequestProject[]
  activeProject?: RequestProject | null
  isLoading?: boolean
  disabled?: boolean
  compact?: boolean
  onChange: (projectId: string | null) => void
}

export function ActiveProjectSelect({
  activeProjectId,
  projects,
  activeProject = null,
  isLoading = false,
  disabled = false,
  compact = false,
  onChange,
}: ActiveProjectSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    onChange(value === NEW_PROJECT_OPTION_VALUE ? null : value || null)
  }

  const isSelectDisabled = disabled || isLoading
  const shouldRenderTemporaryActiveProject =
    Boolean(activeProject) &&
    !projects.some((project) => project.id === activeProject?.id)
  const selectValue = activeProjectId ?? PLACEHOLDER_OPTION_VALUE

  return (
    <label className="block min-w-0">
      <div
        className={`relative ${
          compact ? 'max-w-[220px]' : 'max-w-[260px]'
        }`}
      >
        <select
          value={selectValue}
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
              ? 'rounded-full border-white/55 bg-white/10 text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-12px_28px_rgba(0,0,0,0.18),0_10px_22px_rgba(0,0,0,0.14)] hover:border-white/75 hover:bg-white/18'
              : 'rounded-xl border-white/45 bg-white/8 text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-12px_28px_rgba(0,0,0,0.16),0_10px_22px_rgba(0,0,0,0.12)] hover:border-white/70 hover:bg-white/14'
          }`}
        >
          <option value={PLACEHOLDER_OPTION_VALUE} disabled hidden>
            Seleccionar proyecto
          </option>
          <option value={NEW_PROJECT_OPTION_VALUE}>Nuevo</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
          {shouldRenderTemporaryActiveProject && activeProject ? (
            <option value={activeProject.id}>
              {activeProject.title}
            </option>
          ) : null}
        </select>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
            isSelectDisabled ? 'text-white/40' : 'text-white/85'
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
