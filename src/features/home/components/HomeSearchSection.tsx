import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HeroBackgroundMosaic } from '@/features/home/components/HeroBackgroundMosaic.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { getPublicDepartments } from '@/services/departments.service.ts'
import type { Department } from '@/types/location.ts'

export function HomeSearchSection() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const [searchText, setSearchText] = useState('')
  const [department, setDepartment] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadDepartments() {
      try {
        const nextDepartments = await getPublicDepartments()
        console.log('[hero-departments]', nextDepartments)

        if (!isMounted) {
          return
        }

        setDepartments(nextDepartments)
      } catch (error) {
        console.error('[hero-departments-error]', error)
        if (!isMounted) {
          return
        }

        setDepartments([])
      }
    }

    void loadDepartments()

    return () => {
      isMounted = false
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedSearchText = searchText.trim()
    const params = new URLSearchParams()

    if (trimmedSearchText) {
      params.set('q', trimmedSearchText)
    }

    if (department) {
      params.set('department', department)
    }

    const nextSearch = params.toString()
    navigate(nextSearch ? `/busqueda?${nextSearch}` : '/busqueda')
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-transparent">
      <div className="relative flex min-h-[100svh] items-center px-4 py-8 sm:px-6 sm:py-10 md:min-h-[calc(100svh-96px)] lg:px-10 lg:py-12 2xl:px-14">
        <HeroBackgroundMosaic />

        <div className="relative mx-auto flex w-full max-w-[1720px] justify-center">
          <div className={`w-full max-w-5xl text-center ${!loading && isAuthenticated ? 'space-y-16 sm:space-y-8 lg:space-y-10' : 'space-y-4 sm:space-y-5'}`}>
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Encontrá la locación perfecta para tu próximo proyecto.
                </h1>
              </div>
            </div>

            {!loading && isAuthenticated ? (
              <form
                onSubmit={handleSubmit}
                className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border border-white/10 bg-black/72 px-1 py-1 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[10px] sm:px-1.5"
              >
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar locaciones..."
                  className="min-h-14 min-w-0 flex-1 bg-transparent px-3 text-base text-brand-100 outline-none transition placeholder:text-brand-100/42 sm:text-lg"
                />

                <div className="relative flex min-h-12 shrink-0 items-center border-l border-white/15 pl-3 md:hidden">
                  <div
                    className={`relative inline-flex min-h-12 min-w-12 items-center justify-center text-brand-100 transition ${
                      department
                        ? 'text-brand-300'
                        : 'text-brand-100'
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 6h16" />
                      <path d="M4 12h16" />
                      <path d="M4 18h16" />
                      <circle cx="9" cy="6" r="1.8" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
                      <circle cx="11" cy="18" r="1.8" fill="currentColor" stroke="none" />
                    </svg>
                    {department ? (
                      <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-brand-300" />
                    ) : null}
                    <select
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      aria-label="Filtrar por departamento"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      <option value="">Todo Uruguay</option>
                      {departments.map((availableDepartment) => (
                        <option key={availableDepartment.id} value={availableDepartment.slug}>
                          {availableDepartment.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="hidden min-h-12 shrink-0 border-l border-white/15 bg-transparent px-4 text-base text-brand-100 outline-none md:block"
                >
                  <option value="">Todo Uruguay</option>
                  {departments.map((availableDepartment) => (
                    <option key={availableDepartment.id} value={availableDepartment.slug}>
                      {availableDepartment.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  aria-label="Buscar"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-300 text-brand-950 shadow-[0_12px_28px_rgba(155,120,88,0.24)] transition duration-200 hover:bg-brand-100"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
