import type { CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'

import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'

export const SELECTION_DRAWER_TRIGGER_ID = 'selection-drawer-trigger'

const MOBILE_BOTTOM_NAV_HEIGHT_PX = 76
const MOBILE_TRIGGER_GAP_PX = 12

export function SelectionDrawerTrigger() {
  const location = useLocation()
  const { activeProjectId, images, isDrawerOpen, toggleDrawer } = useImageSelection()
  const { projects } = useRequestProjects()
  const isProjectDetailRoute = /^\/requests\/[^/]+$/u.test(location.pathname)
  const hasImages = images.length > 0
  const activeProjectName =
    activeProjectId !== null
      ? projects.find((project) => project.id === activeProjectId)?.title ?? null
      : null
  const hasMobileBottomNavigation =
    !/^\/admin(?:\/.*)?$/u.test(location.pathname) &&
    location.pathname !== '/404'
  const mobileBottomOffset = hasMobileBottomNavigation
    ? `calc(env(safe-area-inset-bottom) + ${MOBILE_BOTTOM_NAV_HEIGHT_PX + MOBILE_TRIGGER_GAP_PX}px)`
    : 'calc(env(safe-area-inset-bottom) + 1rem)'
  const triggerStyle = {
    '--selection-trigger-bottom': mobileBottomOffset,
    right: 'max(1rem, calc(env(safe-area-inset-right) + 0.25rem))',
  } as CSSProperties & Record<'--selection-trigger-bottom', string>

  if (isProjectDetailRoute) {
    return null
  }

  return (
    <button
      id={SELECTION_DRAWER_TRIGGER_ID}
      type="button"
      onClick={toggleDrawer}
      aria-expanded={isDrawerOpen}
      aria-controls="selection-drawer"
      aria-label="Abrir selección de imágenes"
      className={`fixed bottom-[var(--selection-trigger-bottom)] z-30 inline-flex min-h-16 min-w-16 items-center justify-center overflow-visible rounded-full border shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] md:bottom-[calc(env(safe-area-inset-bottom)+1rem)] ${
        hasImages
          ? 'border-brand-300/60 bg-brand-300 text-brand-950 hover:bg-brand-100'
          : 'border-white/10 bg-[#14110f]/88 text-brand-100 hover:bg-[#201712]'
      }`}
      style={triggerStyle}
    >
      <span
        className={`pointer-events-none absolute -bottom-2 -left-12 z-20 inline-flex max-w-28 items-center justify-center rounded-full border px-3 py-1.5 text-center text-xs font-semibold leading-none shadow-[0_10px_22px_rgba(0,0,0,0.18)] lg:-bottom-2 lg:-left-12 lg:max-w-28 ${
          hasImages
            ? 'border-brand-300/35 bg-brand-100 text-brand-950'
            : 'border-white/10 bg-white/10 text-brand-100 backdrop-blur-md'
        }`}
      >
        <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {activeProjectName ?? 'Selección'}
        </span>
      </span>
      <div className="relative z-10 flex items-center justify-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-9 w-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="m7.5 15 3.2-3.2a1 1 0 0 1 1.4 0l1.8 1.8" />
          <path d="m13.9 13.9 1.3-1.3a1 1 0 0 1 1.4 0l2.9 2.9" />
          <circle cx="9" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <span
        className={`absolute -right-2 -top-2 z-20 inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1.5 text-sm font-semibold shadow-[0_10px_22px_rgba(0,0,0,0.18)] ${
          hasImages
            ? 'border-brand-300/35 bg-brand-100 text-brand-950'
            : 'border-white/10 bg-white/10 text-brand-100 backdrop-blur-md'
        }`}
      >
        {images.length}
      </span>
    </button>
  )
}
