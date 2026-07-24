import { Link } from 'react-router-dom'

import { ScrollReveal } from '@/components/ui/ScrollReveal.tsx'
import publishBackgroundUrl from '@/assets/home-mosaic/publica.webp'

const publishBackgroundImage = {
  src: publishBackgroundUrl,
  alt: 'Locación destacada para sumar al catálogo de producciones audiovisuales.',
}

const publishBenefits = [
  {
    label: 'Sin costo de publicación',
  },
  {
    label: 'Llegá a productoras y equipos creativos',
  },
  {
    label: 'Evaluación personalizada de cada locación',
  },
] as const

function BenefitCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5.75 12.25 4.05 4.05 8.45-8.55" />
    </svg>
  )
}

export function HomePublishLocationSection() {
  return (
    <ScrollReveal
      as="section"
      className="relative left-1/2 mt-16 w-screen -translate-x-1/2 overflow-hidden sm:mt-20 lg:mt-24"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={publishBackgroundImage.src}
          alt={publishBackgroundImage.alt}
          className="cinematic-bg-motion h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/46" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]" />
      </div>

      <div className="relative min-h-[34rem] px-4 py-10 sm:min-h-[36rem] sm:px-6 sm:py-12 lg:min-h-[38rem] lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex min-h-[calc(34rem-5rem)] w-full max-w-[1720px] items-center justify-center sm:min-h-[calc(36rem-6rem)] lg:min-h-[calc(38rem-7rem)]">
          <div className="w-full max-w-4xl space-y-10 text-center sm:space-y-12">
            <div className="mx-auto max-w-3xl space-y-7 sm:space-y-8">
              <div className="space-y-5 sm:space-y-6">
                <h2 className="font-display text-3xl font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-[3.25rem]">
                  ¿Tenés una locación para producciones?
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-7 font-medium text-white/90 sm:text-lg">
                  Buscamos constantemente nuevos espacios para ampliar el catálogo y ofrecer
                  más posibilidades a productoras, marcas y equipos creativos que filman en
                  Uruguay.
                </p>
              </div>
            </div>

            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 sm:gap-5">
              {publishBenefits.map((benefit) => (
                <div
                  key={benefit.label}
                  className="inline-flex items-center justify-center gap-3 text-center text-white"
                >
                  <span className="text-brand-100">
                    <BenefitCheckIcon />
                  </span>
                  <span className="text-base font-medium leading-6 text-white/88 sm:text-lg">
                    {benefit.label}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <Link
                to="/postular-locacion"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-300 px-6 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Quiero publicar mi locación
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}
