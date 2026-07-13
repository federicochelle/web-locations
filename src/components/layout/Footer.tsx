import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import logoUrl from '../../../logo.webp'

const INSTAGRAM_URL = 'https://www.instagram.com/'
const WHATSAPP_URL = 'https://www.whatsapp.com/'

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" strokeWidth="1.6" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current">
      <path d="M12.02 2.4a9.54 9.54 0 0 0-8.3 14.25L2.4 21.6l5.08-1.32a9.6 9.6 0 1 0 4.54-17.88Zm0 17.26a7.93 7.93 0 0 1-4.04-1.1l-.3-.18-3.02.8.82-2.95-.2-.3a7.96 7.96 0 1 1 6.74 3.73Zm4.37-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.4-1.32-1.64-.14-.24-.02-.37.1-.48.1-.1.24-.26.36-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 1.98 0 1.16.86 2.3.98 2.46.12.16 1.68 2.56 4.08 3.6.58.26 1.04.42 1.4.54.58.18 1.1.16 1.52.1.46-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-12 w-12 items-center justify-center rounded-[0.875rem] border border-brand-300/30 text-brand-300 transition hover:bg-brand-300/10 hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#14110f] text-white/70">
      <div className="page-shell py-10 sm:py-12 lg:py-14">
        <div className="grid gap-10 md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <img
              src={logoUrl}
              alt="Film Locations Uruguay"
              className="h-36 w-auto object-contain sm:h-40 lg:h-44"
            />
          </div>

          <div className="space-y-4 text-center lg:px-6">
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100 sm:text-[2rem]">
                ¿Tenes una locacion?
              </h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-white/60 sm:text-base">
                Compartila con nuestro equipo y forma parte de la base de
                locaciones de Uruguay.
              </p>
            </div>

            <div className="flex justify-center">
              <Link
                to="/postular-locacion"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-brand-300/40 px-6 text-sm font-medium text-brand-300 transition hover:bg-brand-300/10 hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] sm:w-auto"
              >
                Publicá tu locación →
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 lg:justify-end">
            <SocialLink href={INSTAGRAM_URL} label="Instagram">
              <InstagramIcon />
            </SocialLink>
            <SocialLink href={WHATSAPP_URL} label="WhatsApp">
              <WhatsAppIcon />
            </SocialLink>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#14110f]">
        <div className="page-shell flex flex-col gap-3 py-4 text-center text-xs text-white/50 sm:py-5 md:text-sm lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <p>© 2026 Film Locations Uruguay. Todos los derechos reservados.</p>

          <div className="flex items-center justify-center gap-3 lg:justify-end">
            <span>Politica de privacidad</span>
            <span aria-hidden="true">·</span>
            <span>Terminos y condiciones</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
