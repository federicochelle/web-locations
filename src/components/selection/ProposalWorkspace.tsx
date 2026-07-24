import type { ReactNode } from 'react'

type ProposalWorkspaceProps = {
  preview: ReactNode
  sidebarTitle: string
  sidebarBody: ReactNode
  sidebarFooter?: ReactNode
  onClose?: () => void
  closeDisabled?: boolean
  sidebarHeader?: ReactNode
  hidePreviewOnMobile?: boolean
}

export function ProposalWorkspace({
  preview,
  sidebarTitle,
  sidebarBody,
  sidebarFooter,
  onClose,
  closeDisabled = false,
  sidebarHeader,
  hidePreviewOnMobile = false,
}: ProposalWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      <section
        className={`min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-8 lg:py-8 ${
          hidePreviewOnMobile ? 'hidden lg:block' : ''
        }`}
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="border border-white/10 bg-[#0f0b09] shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">
                Vista previa PDF
              </p>
            </div>
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {preview}
            </div>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 w-full shrink-0 flex-1 flex-col border-t border-white/10 bg-[#14110f] lg:h-full lg:w-[min(100%,460px)] lg:flex-none lg:border-l lg:border-t-0 lg:shadow-[-16px_0_48px_rgba(0,0,0,0.32)]">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          {sidebarHeader ? (
            <div className="min-w-0 flex-1">{sidebarHeader}</div>
          ) : (
            <div className="min-w-0">
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                {sidebarTitle}
              </h2>
            </div>
          )}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              aria-label="Cerrar flujo de preparacion"
            >
              ×
            </button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-6">
            {sidebarBody}
          </div>
        </div>

        {sidebarFooter ? (
          <footer className="border-t border-white/10 px-4 py-4 sm:px-5">
            {sidebarFooter}
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
