import aboutBackgroundUrl from '@/assets/home-mosaic/foto4-hero-opt.jpg'
import { ScrollReveal } from '@/components/ui/ScrollReveal.tsx'

const aboutBackgroundImage = {
  src: aboutBackgroundUrl,
  alt: 'Locación premium para producciones audiovisuales en Uruguay.',
}

export function HomeAboutSection() {
  return (
    <ScrollReveal
      as="section"
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={aboutBackgroundImage.src}
          alt={aboutBackgroundImage.alt}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/54" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.4),rgba(5,4,4,0.48)_38%,rgba(5,4,4,0.58))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.14),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_50%_50%,transparent_54%,rgba(0,0,0,0.12)_100%)]" />
      </div>

      <div className="relative min-h-[34rem] px-4 py-10 sm:min-h-[36rem] sm:px-6 sm:py-12 lg:min-h-[38rem] lg:px-10 lg:py-14 2xl:px-14">
        <div className="mx-auto flex min-h-[calc(34rem-5rem)] w-full max-w-[1720px] items-center sm:min-h-[calc(36rem-6rem)] lg:min-h-[calc(38rem-7rem)]">
          <div className="w-full max-w-5xl space-y-8">
            <div className="max-w-3xl space-y-6">
              <h2 className="font-display text-3xl font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl lg:text-[3.25rem]">
                La plataforma de locaciones para producciones audiovisuales en Uruguay.
              </h2>

              <div className="max-w-2xl space-y-4 pt-2">
                <p className="text-base leading-7 font-medium text-white/90 sm:text-lg">
                  Reunimos locaciones con identidad, contexto visual y herramientas para que
                  productoras, directoras, equipos creativos y managers puedan descubrir,
                  comparar y organizar espacios con más velocidad.
                </p>
                <p className="text-base leading-7 font-medium text-white/90 sm:text-lg">
                  Film Locations Uruguay reduce la fricción entre buscar referencias,
                  guardar opciones y convertir una selección en un proyecto real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}
