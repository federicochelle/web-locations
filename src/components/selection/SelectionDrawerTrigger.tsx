import { useImageSelection } from '@/hooks/useImageSelection.ts'

export const SELECTION_DRAWER_TRIGGER_ID = 'selection-drawer-trigger'

export function SelectionDrawerTrigger() {
  const { images, isDrawerOpen, toggleDrawer } = useImageSelection()

  return (
    <button
      id={SELECTION_DRAWER_TRIGGER_ID}
      type="button"
      onClick={toggleDrawer}
      aria-expanded={isDrawerOpen}
      aria-controls="selection-drawer"
      aria-label={`Abrir seleccion de imagenes. ${images.length} ${images.length === 1 ? 'imagen seleccionada' : 'imagenes seleccionadas'}`}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-3.5 text-sm font-medium text-brand-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
    >
      <span aria-hidden="true" className="text-base leading-none">
        ▣
      </span>
      <span className="hidden sm:inline">Seleccion</span>
      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-brand-300 px-2 py-1 text-xs font-semibold text-brand-950">
        {images.length}
      </span>
    </button>
  )
}
