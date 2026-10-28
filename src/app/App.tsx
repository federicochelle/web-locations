import { Suspense, lazy, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { RecoveryNotice } from '@/version-recovery/RecoveryNotice.tsx'
import { AuthProvider } from '@/providers/AuthProvider.tsx'
import { AppRouter } from '@/routes/AppRouter.tsx'
import {
  persistSelectionActiveContext,
  restoreSelectionActiveContext,
} from '@/utils/selection-active-context-storage.ts'
import { recoverableImport } from '@/version-recovery/browser.ts'

const PrivateFeatureProviders = lazy(() =>
  recoverableImport(() => import('@/providers/PrivateFeatureProviders.tsx')).then((module) => ({
    default: module.PrivateFeatureProviders,
  })),
)

function PrivateFeatureGate({ children }: { children: ReactNode }) {
  const { canUsePrivateFeatures, loading, user } = useAuth()
  const userId = user?.id ?? null
  // Once a user's private features are ready, keep the providers mounted for that user so a
  // transient profile reload (e.g. Supabase re-emitting SIGNED_IN on tab focus) does not
  // unmount the router and lose UI state. Sign-out or a different user resets it.
  const [privateUserId, setPrivateUserId] = useState<string | null>(null)
  let activePrivateUserId = privateUserId

  if (activePrivateUserId !== null && activePrivateUserId !== userId) {
    activePrivateUserId = null
  }

  if (activePrivateUserId === null && canUsePrivateFeatures && userId) {
    activePrivateUserId = userId
  }

  if (activePrivateUserId !== privateUserId) {
    setPrivateUserId(activePrivateUserId)
  }

  useEffect(() => {
    if (loading || canUsePrivateFeatures) {
      return
    }

    if (restoreSelectionActiveContext()?.mode === 'project') {
      persistSelectionActiveContext({ mode: 'new' })
    }
  }, [canUsePrivateFeatures, loading])

  if (activePrivateUserId === null) {
    return children
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black px-4 py-10">
          <AppLoading label="Cargando tu espacio..." />
        </div>
      }
    >
      <PrivateFeatureProviders key={activePrivateUserId}>{children}</PrivateFeatureProviders>
    </Suspense>
  )
}

export function App() {
  return (
    <>
      <RecoveryNotice />
      <AuthProvider>
        <PrivateFeatureGate>
          <AppRouter />
        </PrivateFeatureGate>
      </AuthProvider>
    </>
  )
}
