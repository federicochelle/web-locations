import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { HeroBackgroundMosaic } from '@/features/home/components/HeroBackgroundMosaic.tsx'

export function HomeSearchSection() {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [department, setDepartment] = useState('Montevideo')

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

  if (!trimmedSearchText && !department) {
    return
  }

  navigate(`/busqueda?${params.toString()}`)
}

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-transparent">
      <div className="relative flex min-h-[100dvh] items-center px-4 py-8 sm:px-6 sm:py-10 md:min-h-[calc(100dvh-96px)] lg:px-10 lg:py-12 2xl:px-14">
        <HeroBackgroundMosaic />

        <div className="relative mx-auto flex w-full max-w-[1720px] justify-center">
          <div className="w-full max-w-5xl space-y-16 text-center sm:space-y-8 lg:space-y-10">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Encontrá la locación perfecta para tu próxima producción.
                </h1>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-full border border-white/10 bg-black/72 px-3 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[10px] sm:px-4"
            >
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar locaciones..."
                className="min-h-14 flex-1 bg-transparent px-3 text-base text-brand-100 outline-none transition placeholder:text-brand-100/42 sm:text-lg"
              />

              <select
  value={department}
  onChange={(event) => setDepartment(event.target.value)}
  className="min-h-12 shrink-0 border-l border-white/15 bg-transparent px-4 text-base text-brand-100 outline-none"
>
  <option value="Montevideo">Montevideo</option>
  <option value="Canelones">Canelones</option>
  <option value="Maldonado">Maldonado</option>
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
          </div>
        </div>
      </div>
    </section>
  )
}
