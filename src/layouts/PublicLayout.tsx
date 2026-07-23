import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation.tsx'
import { ScrollManager } from '@/components/routing/ScrollManager.tsx'
import { SelectionDrawer } from '@/components/selection/SelectionDrawer.tsx'
import { SelectionDrawerTrigger } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import logoUrl from '../../logo.webp'

export function PublicLayout() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()
  const { closeDrawer } = useImageSelection()
  const isNotFoundRoute = location.pathname === '/404'
  const isRequestDetailPage =
    /^\/requests\/[^/]+$/u.test(location.pathname) &&
    location.pathname !== '/requests/new'
  const shouldShowHeaderOnMobile = isNotFoundRoute

  useEffect(() => {
    if (!isRequestDetailPage) {
      return
    }

    closeDrawer()
  }, [closeDrawer, isRequestDetailPage])

  return (
    <div className="relative flex min-h-screen flex-col bg-transparent pb-[calc(76px+env(safe-area-inset-bottom))] text-brand-950 md:pb-0">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0908]" />
        <div
          className="absolute inset-0 bg-center bg-no-repeat opacity-[0.07]"
          style={{
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: 'min(72vw, 760px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_38%),linear-gradient(180deg,rgba(10,8,7,0.78),rgba(10,8,7,0.66)_24%,rgba(10,8,7,0.72)_72%,rgba(10,8,7,0.84))]" />
      </div>
      <ScrollManager />
      <div className={shouldShowHeaderOnMobile ? 'relative z-20' : 'relative z-20 hidden md:block'}>
        <Header />
      </div>
      <main className="relative z-10 flex-1 overflow-hidden bg-transparent">
        <div className="page-shell relative">
          <Outlet />
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <MobileBottomNavigation />
      {!isRequestDetailPage && !loading && isAuthenticated ? <SelectionDrawerTrigger /> : null}
      {!isRequestDetailPage ? <SelectionDrawer /> : null}
    </div>
  )
}
