import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function PrivacyPage() {
  usePageTitle('Política de Privacidad')

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-5xl rounded-none border-x-0 border-y border-white/8 bg-[#1B1B1D] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:rounded-[1rem] sm:border sm:p-8 lg:p-10">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-300/72">
              Film Locations UY
            </p>
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
              Política de Privacidad
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-brand-100/68 sm:text-base">
              Contenido pendiente.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
