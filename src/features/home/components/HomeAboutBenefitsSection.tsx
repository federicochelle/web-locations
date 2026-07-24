import { useEffect, useRef, useState } from 'react'

const aboutBenefits = [
  {
    title: 'Locaciones verificadas',
    description: 'Un catálogo curado para acelerar la búsqueda y tomar decisiones con más confianza.',
  },
  {
    title: 'Pensado para productoras y equipos creativos',
    description: 'Una experiencia clara para descubrir espacios según estilo, categoría y necesidades reales de producción.',
  },
  {
    title: 'Organización de proyectos en un solo lugar',
    description: 'Guardá favoritos, armá selecciones y avanzá con una propuesta sin salir de la plataforma.',
  },
] as const

function VerifiedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-40 w-40 sm:h-48 sm:w-48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9.25 12 1.85 1.85L14.75 10.2" />
      <path d="M12 3.75 5.75 6v5.3c0 4.02 2.6 7.76 6.25 8.95 3.65-1.19 6.25-4.93 6.25-8.95V6L12 3.75Z" />
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-40 w-40 sm:h-48 sm:w-48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="9" r="2.75" />
      <circle cx="16.5" cy="8.25" r="2.25" />
      <path d="M3.75 18.5a4.75 4.75 0 0 1 8.5-2.9" />
      <path d="M13.75 18.25a3.75 3.75 0 0 1 6.5-2.4" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-40 w-40 sm:h-48 sm:w-48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 7.5A1.75 1.75 0 0 1 5.5 5.75h4l1.5 1.75h7.5a1.75 1.75 0 0 1 1.75 1.75v8.25a1.75 1.75 0 0 1-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75V7.5Z" />
      <path d="M3.75 9.25h16.5" />
    </svg>
  )
}

const aboutBenefitIcons = [VerifiedIcon, TeamIcon, FolderIcon] as const

export function HomeAboutBenefitsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches) {
      setIsVisible(true)
      return
    }

    const currentSection = sectionRef.current

    if (!currentSection) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      },
    )

    observer.observe(currentSection)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative left-1/2 w-screen -translate-x-1/2 bg-black/18"
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-3">
        {aboutBenefits.map((benefit, index) => {
          const Icon = aboutBenefitIcons[index]

          return (
            <article
              key={benefit.title}
              className={`min-h-[16rem] px-5 py-6 transition-[transform,opacity,background-color] duration-700 ease-out hover:bg-black/24 motion-reduce:transition-none sm:min-h-[17rem] sm:px-6 sm:py-7 lg:min-h-[18rem] lg:px-8 lg:py-8 ${
                isVisible
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-8 opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-100'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 260}ms` : '0ms',
              }}
            >
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <div className="text-white">
                  <Icon />
                </div>
                <div className="max-w-sm space-y-4">
                  <h3 className="font-display text-[1.55rem] font-semibold italic leading-[1.02] tracking-[-0.03em] text-white sm:text-[1.8rem]">
                    {benefit.title}
                  </h3>
                  <p className="text-base leading-6 text-white/80">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
