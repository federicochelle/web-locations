import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { SelectionDrawer } from '@/components/selection/SelectionDrawer.tsx'
import { SelectionDrawerTrigger } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useImageSelection } from '@/hooks/useImageSelection.ts'

export function PublicLayout() {
  const location = useLocation()
  const { closeDrawer } = useImageSelection()
  const isRequestDetailPage =
    /^\/requests\/[^/]+$/u.test(location.pathname) &&
    location.pathname !== '/requests/new'

  useEffect(() => {
    if (!isRequestDetailPage) {
      return
    }

    closeDrawer()
  }, [closeDrawer, isRequestDetailPage])

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-brand-950">
      <Header />
      <main className="relative flex-1 overflow-hidden bg-transparent">
        <div className="page-shell relative">
          <Outlet />
        </div>
      </main>
      <Footer />
      {!isRequestDetailPage ? <SelectionDrawerTrigger /> : null}
      {!isRequestDetailPage ? <SelectionDrawer /> : null}
    </div>
  )
}
