import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HeroBackgroundMosaic } from '@/features/home/components/HeroBackgroundMosaic.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { reportOperationalError } from '@/sentry-observability.ts'
import { getPublicDepartments } from '@/services/departments.service.ts'
import type { Category, Department } from '@/types/location.ts'

type HomeSearchSectionProps = {
  categories: Category[]
}

export function HomeSearchSection({ categories }: HomeSearchSectionProps) {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const categoryComboboxRef = useRef<HTMLDivElement | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [department, setDepartment] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [isCategoryComboboxOpen, setIsCategoryComboboxOpen] = useState(false)
  const normalizedCategoryFilter = categoryFilter.trim().toLocaleLowerCase('es-UY')
  const filteredCategories = useMemo(() => {
    if (!normalizedCategoryFilter) {
      return categories
    }

    return categories.filter((category) =>
      category.name.toLocaleLowerCase('es-UY').includes(normalizedCategoryFilter),
    )
  }, [categories, normalizedCategoryFilter])

  useEffect(() => {
    let isMounted = true

    async function loadDepartments() {
      try {
        const nextDepartments = await getPublicDepartments()

        if (!isMounted) {
          return
        }

        setDepartments(nextDepartments)
      } catch (error) {
        if (!isMounted) {
          return
        }

        reportOperationalError(error, {
          action: 'home.departments.load',
          table: 'departments',
        })
        setDepartments([])
      }
    }

    void loadDepartments()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isCategoryComboboxOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!categoryComboboxRef.current) {
        return
      }

      const target = event.target

      if (target instanceof Node && !categoryComboboxRef.current.contains(target)) {
        setIsCategoryComboboxOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isCategoryComboboxOpen])

  function selectCategory(category: Category) {
    setSelectedCategory(category)
    setCategoryFilter(category.name)
    setIsCategoryComboboxOpen(false)
  }

  function navigateToSelectedCategory() {
    if (!selectedCategory) {
      setIsCategoryComboboxOpen(true)
      return
    }

    const params = new URLSearchParams()

    if (department) {
      params.set('department', department)
    }

    const nextSearch = params.toString()
    navigate(`/categorias/${selectedCategory.slug}${nextSearch ? `?${nextSearch}` : ''}`)
  }

  function handleCategoryInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsCategoryComboboxOpen(false)
      return
    }

    if (event.key !== 'Enter' || filteredCategories.length === 0) {
      return
    }

    event.preventDefault()
    selectCategory(filteredCategories[0])
  }

  return (
    <section className="relative z-10 left-1/2 w-screen -translate-x-1/2 overflow-visible bg-transparent">
      <div className="relative flex min-h-[100svh] items-center px-4 py-8 sm:px-6 sm:py-10 md:min-h-[calc(100svh-96px)] lg:px-10 lg:py-12 2xl:px-14">
        <HeroBackgroundMosaic />

        <div className="relative z-20 mx-auto flex w-full max-w-[1720px] justify-center">
          <div className={`w-full max-w-5xl text-center ${!loading && isAuthenticated ? 'space-y-16 sm:space-y-8 lg:space-y-10' : 'space-y-4 sm:space-y-5'}`}>
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Encontrá la locación perfecta para tu próximo proyecto.
                </h1>
              </div>
            </div>

            {!loading && isAuthenticated ? (
              <div
                className="relative z-50 mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border border-white/10 bg-black/72 px-1 py-1 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[10px] sm:px-1.5"
              >
                <div ref={categoryComboboxRef} className="relative min-w-0 flex-1">
                  <input
                    type="search"
                    role="combobox"
                    aria-label="Elegir categoría"
                    aria-expanded={isCategoryComboboxOpen}
                    aria-controls="home-category-options"
                    aria-autocomplete="list"
                    value={categoryFilter}
                    onChange={(event) => {
                      const nextCategoryFilter = event.target.value
                      setCategoryFilter(nextCategoryFilter)
                      setSelectedCategory((currentCategory) =>
                        currentCategory?.name === nextCategoryFilter ? currentCategory : null,
                      )
                      setIsCategoryComboboxOpen(true)
                    }}
                    onFocus={() => {
                      setIsCategoryComboboxOpen(true)
                    }}
                    onKeyDown={handleCategoryInputKeyDown}
                    placeholder="Elegí una categoría..."
                    className="min-h-14 w-full min-w-0 bg-transparent py-0 pl-3 pr-10 text-base text-brand-100 outline-none transition placeholder:text-brand-100/42 focus-visible:ring-2 focus-visible:ring-brand-300 sm:text-lg"
                  />

                  <button
                    type="button"
                    aria-label="Abrir categorías"
                    aria-haspopup="listbox"
                    aria-expanded={isCategoryComboboxOpen}
                    onClick={() => {
                      setIsCategoryComboboxOpen((currentValue) => !currentValue)
                    }}
                    className="absolute right-1.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-brand-100/68 transition hover:bg-white/6 hover:text-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className={`h-5 w-5 transition ${isCategoryComboboxOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isCategoryComboboxOpen ? (
                    <div
                      id="home-category-options"
                      role="listbox"
                      className="absolute left-2 top-full z-[70] max-h-[15rem] w-[calc(100%-0.5rem)] overflow-y-auto rounded-b-[1.35rem] rounded-t-none border border-t-0 border-white/10 bg-black/90 p-2 shadow-[0_24px_48px_rgba(0,0,0,0.42)] backdrop-blur-[10px] sm:left-2.5 sm:w-[calc(100%-0.625rem)]"
                    >
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              selectCategory(category)
                            }}
                            className="flex min-h-11 w-full items-center rounded-[0.9rem] px-3 text-left text-sm font-medium text-brand-100 transition hover:bg-white/6 hover:text-brand-300 focus-visible:bg-white/6 focus-visible:text-brand-300 focus-visible:outline-none"
                          >
                            <span className="min-w-0 truncate">{category.name}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2.5 text-sm text-brand-100/52">
                          No hay categorías con ese nombre.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

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
                  type="button"
                  aria-label="Buscar categoría seleccionada"
                  onClick={navigateToSelectedCategory}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-300 text-brand-950 shadow-[0_12px_28px_rgba(155,120,88,0.24)] transition duration-200 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCategory}
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
