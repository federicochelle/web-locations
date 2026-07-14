import { useEffect, useMemo, useRef, useState } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

type RequestProjectPickerModalProps = {
  isOpen: boolean
  isLoadingProjects: boolean
  isCreatingProject: boolean
  isAddingLocation: boolean
  projects: RequestProject[]
  error: string | null
  successMessage: string | null
  onClose: () => void
  onAddToProject: (projectId: string) => Promise<void>
  onCreateProject: (title: string) => Promise<void>
  onViewProject?: (projectId: string) => void
}

export function RequestProjectPickerModal({
  isOpen,
  isLoadingProjects,
  isCreatingProject,
  isAddingLocation,
  projects,
  error,
  successMessage,
  onClose,
  onAddToProject,
  onCreateProject,
  onViewProject,
}: RequestProjectPickerModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const primaryActionRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [lastProjectId, setLastProjectId] = useState<string | null>(null)

  const isBusy = isLoadingProjects || isCreatingProject || isAddingLocation
  const hasProjects = projects.length > 0

  const activeError = validationError ?? error

  const helperText = useMemo(() => {
    if (!hasProjects && !isCreateMode) {
      return 'Creá uno para organizar esta locación y continuar armando tu selección.'
    }

    if (isCreateMode) {
      return 'Elegí un nombre para crear un proyecto nuevo y guardar esta locación.'
    }

    return 'Seleccioná el proyecto donde querés guardar esta locación.'
  }, [hasProjects, isCreateMode])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isBusy) {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBusy, isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setIsCreateMode(false)
      setProjectTitle('')
      setValidationError(null)
      setLastProjectId(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (isCreateMode) {
      inputRef.current?.focus()
      return
    }

    if (hasProjects) {
      primaryActionRef.current?.focus()
      return
    }

    if (!hasProjects && !isCreateMode) {
      primaryActionRef.current?.focus()
      return
    }

    closeButtonRef.current?.focus()
  }, [hasProjects, isCreateMode, isOpen])

  if (!isOpen) {
    return null
  }

  async function handleCreateProject() {
    const trimmedTitle = projectTitle.trim()

    if (!trimmedTitle) {
      setValidationError('Ingresa un titulo para tu proyecto.')
      return
    }

    setValidationError(null)
    await onCreateProject(trimmedTitle)
    setLastProjectId(null)
    setProjectTitle('')
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-project-picker-title"
        className="w-full max-w-4xl rounded-[1.25rem] border border-white/10 bg-[#1B1B1D] p-5 text-brand-100 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h2
              id="request-project-picker-title"
              className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
            >
              {!hasProjects && !isCreateMode
                ? 'Todavía no creaste ningún proyecto'
                : isCreateMode
                  ? 'Crear proyecto'
                  : 'Agregar a proyecto'}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              {helperText}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-brand-100/72 transition hover:bg-white/6 hover:text-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {activeError ? (
            <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {activeError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}

          {isLoadingProjects ? (
            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[120px] animate-pulse rounded-[1rem] bg-white/6"
                />
              ))}
            </div>
          ) : null}

          {!isLoadingProjects && isCreateMode ? (
            <div className="rounded-[1rem] border border-white/10 bg-white/4 p-4 sm:p-5">
              <div className="space-y-4">
                <label className="block space-y-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
                    Nombre del proyecto
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={projectTitle}
                    onChange={(event) => {
                      setProjectTitle(event.target.value)
                      setValidationError(null)
                    }}
                    disabled={isBusy}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Ej. Campaña exterior de verano"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {hasProjects ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMode(false)
                        setProjectTitle('')
                        setValidationError(null)
                      }}
                      disabled={isBusy}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Volver a proyectos
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      void handleCreateProject()
                    }}
                    disabled={isBusy}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCreatingProject ? 'Creando proyecto...' : 'Crear proyecto'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!isLoadingProjects && hasProjects && !isCreateMode ? (
            <>
              <div className="grid gap-4">
                {projects.map((project, index) => (
                  <article
                    key={project.id}
                    className="rounded-[1rem] border border-white/10 bg-white/4 px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h3 className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
                          {project.title}
                        </h3>
                      </div>

                      <button
                        ref={index === 0 ? primaryActionRef : null}
                        type="button"
                        onClick={() => {
                          setLastProjectId(project.id)
                          void onAddToProject(project.id)
                        }}
                        disabled={isBusy}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className="mr-2 h-4 w-4 fill-current"
                        >
                          <path d="M9 4a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
                        </svg>
                        {isAddingLocation ? 'Agregando...' : 'Agregar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMode(true)
                    setValidationError(null)
                  }}
                  disabled={isBusy}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Crear nuevo proyecto
                </button>

                {successMessage && lastProjectId && onViewProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      onViewProject(lastProjectId)
                    }}
                    disabled={isBusy}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white/8 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Ver proyecto
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {!isLoadingProjects && !hasProjects && !isCreateMode ? (
            <div className="flex justify-start">
              <button
                ref={primaryActionRef}
                type="button"
                onClick={() => {
                  setIsCreateMode(true)
                  setValidationError(null)
                }}
                disabled={isBusy}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Crear proyecto
              </button>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
