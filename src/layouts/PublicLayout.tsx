import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation.tsx'
import { ScrollManager } from '@/components/routing/ScrollManager.tsx'
import { SelectionDrawer } from '@/components/selection/SelectionDrawer.tsx'
import { SelectionDrawerTrigger } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { GOLDEN_PI_URL } from '@/utils/external-links.ts'
import { hasPasswordRecoveryPending } from '@/utils/password-recovery-session.ts'
import logoUrl from '../../logo.webp'

export function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const isNotFoundRoute = location.pathname === '/404'
  const shouldShowHeaderOnMobile = isNotFoundRoute

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return
    }

    if (location.pathname !== '/' || !hasPasswordRecoveryPending()) {
      return
    }

    navigate('/reset-password', { replace: true })
  }, [isAuthenticated, loading, location.pathname, navigate])

  return (
    <div className="relative flex min-h-screen flex-col bg-transparent pb-[calc(76px+env(safe-area-inset-bottom))] text-brand-950 md:pb-0">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0908]" />
        <div
          className="absolute inset-0 bg-center bg-no-repeat opacity-[0.1]"
          style={{
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: 'min(72vw, 760px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_42%),linear-gradient(180deg,rgba(10,8,7,0.7),rgba(10,8,7,0.56)_24%,rgba(10,8,7,0.62)_72%,rgba(10,8,7,0.76))]" />
      </div>
      <ScrollManager />
      <a
        href={GOLDEN_PI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sticky top-0 z-30 block overflow-hidden bg-[#daa61a] px-4 py-0.5 text-center text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white [font-family:var(--font-lato)] shadow-[0_8px_24px_rgba(0,0,0,0.18)] md:hidden"
      >
        <span className="relative z-10">Golden Proyectos Inmobiliarios</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[65%] bg-[linear-gradient(180deg,rgba(20,17,15,0)_0%,rgba(20,17,15,0.18)_38%,rgba(20,17,15,0.5)_100%)]"
        />
      </a>
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
      {!loading && isAuthenticated ? <SelectionDrawerTrigger /> : null}
      <SelectionDrawer />
    </div>
  )
}
