import { Outlet } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { SelectionDrawer } from '@/components/selection/SelectionDrawer.tsx'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent text-brand-950">
      <Header />
      <main className="relative flex-1 overflow-hidden bg-transparent">
        <div className="page-shell relative">
          <Outlet />
        </div>
      </main>
      <Footer />
      <SelectionDrawer />
    </div>
  )
}
