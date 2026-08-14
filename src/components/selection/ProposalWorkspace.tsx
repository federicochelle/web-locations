import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import drawerHeaderBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.40 PM.webp'
import proposalFooterBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (3).webp'
import { SelectionDrawerHeader } from '@/components/selection/SelectionDrawerHeader.tsx'

type ProposalWorkspaceProps = {
  preview: ReactNode
  sidebarTitle: string
  sidebarBody: ReactNode
  sidebarFooter?: ReactNode
  onClose?: () => void
  closeDisabled?: boolean
  sidebarHeader?: ReactNode
  hidePreviewOnMobile?: boolean
  rootClassName?: string
  previewSectionClassName?: string
  previewInnerClassName?: string
  sidebarClassName?: string
  hideSidebarHeader?: boolean
  sidebarBodyClassName?: string
  sidebarBodyInnerClassName?: string
  syncPreviewHeightWithSidebar?: boolean
  syncPreviewFooterOffsetWithSidebarFooter?: boolean
}

const proposalFooterOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const proposalFooterHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

const proposalHeaderOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const proposalHeaderHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

export function ProposalWorkspace({
  preview,
  sidebarTitle,
  sidebarBody,
  sidebarFooter,
  onClose,
  closeDisabled = false,
  sidebarHeader,
  hidePreviewOnMobile = false,
  rootClassName,
  previewSectionClassName,
  previewInnerClassName,
  sidebarClassName,
  hideSidebarHeader = false,
  sidebarBodyClassName,
  sidebarBodyInnerClassName,
  syncPreviewHeightWithSidebar = false,
  syncPreviewFooterOffsetWithSidebarFooter = false,
}: ProposalWorkspaceProps) {
  const sidebarRef = useRef<HTMLElement | null>(null)
  const sidebarFooterRef = useRef<HTMLElement | null>(null)
  const [syncedPreviewHeight, setSyncedPreviewHeight] = useState<number | null>(null)
  const [syncedPreviewFooterOffset, setSyncedPreviewFooterOffset] = useState<number | null>(null)

  useEffect(() => {
    if (!syncPreviewHeightWithSidebar) {
      return
    }

    const sidebarElement = sidebarRef.current

    if (!sidebarElement || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateHeight = () => {
      setSyncedPreviewHeight(sidebarElement.getBoundingClientRect().height)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    resizeObserver.observe(sidebarElement)
    window.addEventListener('resize', updateHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [syncPreviewHeightWithSidebar])

  useEffect(() => {
    if (!syncPreviewFooterOffsetWithSidebarFooter) {
      return
    }

    const footerElement = sidebarFooterRef.current

    if (!footerElement || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateFooterOffset = () => {
      setSyncedPreviewFooterOffset(footerElement.getBoundingClientRect().height)
    }

    updateFooterOffset()

    const resizeObserver = new ResizeObserver(() => {
      updateFooterOffset()
    })

    resizeObserver.observe(footerElement)
    window.addEventListener('resize', updateFooterOffset)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateFooterOffset)
    }
  }, [syncPreviewFooterOffsetWithSidebarFooter])

  const previewSectionStyle =
    syncPreviewHeightWithSidebar && syncedPreviewHeight
      ? ({
        '--proposal-preview-height': `${syncedPreviewHeight}px`,
        ...(syncPreviewFooterOffsetWithSidebarFooter && syncedPreviewFooterOffset
          ? { '--proposal-preview-footer-offset': `${syncedPreviewFooterOffset}px` }
          : {}),
      } as CSSProperties)
      : syncPreviewFooterOffsetWithSidebarFooter && syncedPreviewFooterOffset
        ? ({
            '--proposal-preview-footer-offset': `${syncedPreviewFooterOffset}px`,
          } as CSSProperties)
        : undefined

  return (
    <div className={`flex h-full min-h-0 w-full flex-col lg:flex-row ${rootClassName ?? ''}`}>
      <section
        className={`min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-8 lg:py-8 ${
          hidePreviewOnMobile ? 'hidden lg:block' : ''
        } ${syncPreviewHeightWithSidebar ? 'lg:h-[var(--proposal-preview-height)]' : ''} ${previewSectionClassName ?? ''}`}
        style={previewSectionStyle}
      >
        <div className={`mx-auto w-full max-w-5xl ${previewInnerClassName ?? ''}`}>
          {preview}
        </div>
        {syncPreviewFooterOffsetWithSidebarFooter ? (
          <div
            aria-hidden="true"
            className="hidden lg:block"
            style={{
              height: syncedPreviewFooterOffset
                ? `var(--proposal-preview-footer-offset)`
                : undefined,
            }}
          />
        ) : null}
      </section>

      <aside
        ref={sidebarRef}
        className={`flex min-h-0 w-full shrink-0 flex-1 flex-col border-t border-white/10 bg-[#14110f] lg:w-[min(100%,460px)] lg:flex-none lg:self-stretch lg:border-l lg:border-t-0 lg:shadow-[-16px_0_48px_rgba(0,0,0,0.32)] ${sidebarClassName ?? ''}`}
      >
        {hideSidebarHeader ? null : onClose ? (
          <SelectionDrawerHeader
            closeAriaLabel="Cerrar flujo de preparacion"
            closeDisabled={closeDisabled}
            leftContent={
              sidebarHeader ?? (
                <span className="sr-only">
                  {sidebarTitle}
                </span>
              )
            }
            onClose={onClose}
          />
        ) : (
          <header className="relative shrink-0 overflow-hidden border-b border-white/10">
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={drawerHeaderBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={proposalHeaderOverlayClassName} />
              <div className={proposalHeaderHighlightClassName} />
            </div>
            <div className="relative min-w-0 px-4 py-4 sm:px-5">
              {sidebarHeader ?? (
                <span className="sr-only">
                  {sidebarTitle}
                </span>
              )}
            </div>
          </header>
        )}

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 ${sidebarBodyClassName ?? ''}`}>
          <div className={`space-y-6 ${sidebarBodyInnerClassName ?? ''}`}>
            {sidebarBody}
          </div>
        </div>

        {sidebarFooter ? (
          <footer
            ref={sidebarFooterRef}
            className="relative overflow-hidden border-t border-white/10"
          >
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={proposalFooterBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={proposalFooterOverlayClassName} />
              <div className={proposalFooterHighlightClassName} />
            </div>
            <div className="relative px-4 py-4 sm:px-5">{sidebarFooter}</div>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
