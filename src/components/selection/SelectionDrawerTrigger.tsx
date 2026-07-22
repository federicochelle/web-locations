import { useImageSelection } from '@/hooks/useImageSelection.ts'

export const SELECTION_DRAWER_TRIGGER_ID = 'selection-drawer-trigger'

export function SelectionDrawerTrigger() {
  const { images, isDrawerOpen, toggleDrawer } = useImageSelection()
  const hasImages = images.length > 0

  return (
    <button
      id={SELECTION_DRAWER_TRIGGER_ID}
      type="button"
      onClick={toggleDrawer}
      aria-expanded={isDrawerOpen}
      aria-controls="selection-drawer"
      aria-label="Abrir selección de imágenes"
      className={`fixed z-30 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] lg:min-h-16 lg:min-w-16 ${
        hasImages
          ? 'border-brand-300/60 bg-brand-300 text-brand-950 hover:bg-brand-100'
          : 'border-white/10 bg-[#14110f]/88 text-brand-100 hover:bg-[#201712]'
      }`}
      style={{
        right: 'max(1rem, calc(env(safe-area-inset-right) + 0.25rem))',
        bottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
      }}
    >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 lg:h-7 lg:w-7"
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
      <span
        className={`absolute -right-1.5 -top-1.5 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold lg:-right-2 lg:-top-2 lg:min-w-8 lg:text-sm ${
          hasImages
            ? 'bg-brand-100 text-brand-950'
            : 'bg-white/10 text-brand-100'
        }`}
      >
        {images.length}
      </span>
    </button>
  )
}
