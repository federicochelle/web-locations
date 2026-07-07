import { Outlet } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer.tsx'
import { Header } from '@/components/layout/Header.tsx'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent text-brand-950">
      <Header />
      <main className="page-shell flex-1 py-10 sm:py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
