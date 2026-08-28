import goldenPiImageUrl from '@/assets/goldenpi.jpeg'
import aboutImageOneUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (1).webp'
import aboutImageTwoUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM.webp'
import { ScrollReveal } from '@/components/ui/ScrollReveal.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

const GOLDEN_PI_URL = 'https://www.goldenpi.com.uy/'

type AboutSectionProps = {
  title: string
  body: string[]
  headingLevel?: 'h1' | 'h2'
  reverseOnDesktop?: boolean
  eyebrow?: string
  ctaLabel?: string
  ctaHref?: string
  extraTopSpacing?: boolean
  imageLabel?: string
  imageSrc?: string
  imageAlt?: string
  imageClassName?: string
  revealDelayMs?: number
}

function PlaceholderVisual({ label }: { label: string }) {
  return (
    <div className="aspect-[4/3] w-full bg-[linear-gradient(180deg,#28211c,#171311)]">
      <div className="flex h-full w-full items-center justify-center px-6 text-center">
        <span className="font-display text-sm font-medium uppercase tracking-[0.24em] text-white/40 sm:text-base">
          {label}
        </span>
      </div>
    </div>
  )
}

function AboutSection({
  title,
  body,
  headingLevel = 'h2',
  reverseOnDesktop = false,
  eyebrow,
  ctaLabel,
  ctaHref,
  extraTopSpacing = false,
  imageLabel,
  imageSrc,
  imageAlt = '',
  imageClassName = 'h-full w-full object-cover',
  revealDelayMs = 0,
}: AboutSectionProps) {
  const HeadingTag = headingLevel

  return (
    <ScrollReveal
      as="section"
      className={extraTopSpacing ? 'py-10 pt-14 sm:py-12 sm:pt-18 lg:py-16 lg:pt-22' : 'py-10 sm:py-12 lg:py-16'}
      style={{ transitionDelay: `${revealDelayMs}ms` }}
    >
      <div className="grid items-center gap-7 md:gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-14">
        <div className={`space-y-5 ${reverseOnDesktop ? 'lg:order-2' : ''}`}>
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-300">
              {eyebrow}
            </p>
          ) : null}
          <HeadingTag className="font-display text-[2rem] font-semibold leading-[0.96] tracking-[-0.04em] text-brand-100 sm:text-[2.35rem] lg:text-[2.65rem]">
            {title}
          </HeadingTag>
          <div className="max-w-[38rem] space-y-4 text-base leading-8 text-brand-100/78 sm:text-[1.05rem]">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {ctaLabel && ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-brand-300 transition hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0908]"
            >
              <span>{ctaLabel}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12h13" />
                <path d="m11 5 7 7-7 7" />
              </svg>
            </a>
          ) : null}
        </div>

        <div className={reverseOnDesktop ? 'lg:order-1' : ''}>
          {imageSrc && ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0908]"
            >
              <div className="relative flex aspect-[4/3] w-full items-center justify-center">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="h-full max-h-full w-auto max-w-full object-contain transition duration-300 hover:opacity-92"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/12" />
              </div>
            </a>
          ) : imageSrc ? (
            <div className="relative flex aspect-[4/3] w-full items-center justify-center">
              <img
                src={imageSrc}
                alt={imageAlt}
                className={imageClassName}
              />
              <div className="pointer-events-none absolute inset-0 bg-black/12" />
            </div>
          ) : (
            <PlaceholderVisual label={imageLabel ?? ''} />
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}

export function AboutPage() {
  usePageTitle('Nosotros')

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <AboutSection
          headingLevel="h1"
          title="Locaciones que cuentan historias"
          imageSrc={aboutImageOneUrl}
          imageAlt="Locación destacada de Film Locations"
          revealDelayMs={0}
          body={[
            'En Film Locations conectamos espacios únicos con producciones audiovisuales.',
            'Trabajamos para facilitar la búsqueda de locaciones en Uruguay, reuniendo casas, edificios, espacios industriales, paisajes, comercios y lugares singulares dentro de una plataforma pensada para productoras, fotógrafos, agencias y equipos creativos.',
            'Nuestro objetivo es hacer que encontrar el lugar indicado para cada proyecto sea más simple, rápido y ordenado.',
          ]}
        />

        <AboutSection
          reverseOnDesktop
          title="Una selección pensada para producir"
          imageSrc={aboutImageTwoUrl}
          imageAlt="Espacio seleccionado para scouting y producción"
          revealDelayMs={90}
          body={[
            'Cada locación forma parte de una selección construida pensando en las necesidades reales de una producción.',
            'Buscamos espacios con carácter, variedad y potencial audiovisual, y organizamos la información para que los equipos puedan explorar alternativas, comparar opciones y encontrar locaciones que se adapten a cada idea.',
            'Además de mostrar espacios, buscamos generar un puente claro entre propietarios, locaciones y profesionales de la industria audiovisual.',
          ]}
        />

        <AboutSection
          title="Una alianza que amplía nuestra mirada"
          eyebrow="GOLDEN PI"
          ctaLabel="Conocé Golden Pi"
          ctaHref={GOLDEN_PI_URL}
          extraTopSpacing
          imageSrc={goldenPiImageUrl}
          imageAlt="Golden Pi"
          imageClassName="h-full max-h-full w-auto max-w-full object-contain"
          revealDelayMs={180}
          body={[
            'Film Locations trabaja junto a Golden Pi, empresa vinculada al sector inmobiliario, combinando experiencia en propiedades y conocimiento del mercado con las necesidades específicas del mundo audiovisual.',
            'Esta colaboración amplía nuestra red de espacios y nos permite descubrir nuevas oportunidades, acercando propiedades y locaciones con potencial para producciones, campañas, fotografía y proyectos creativos.',
          ]}
        />
      </div>
    </div>
  )
}
