import { Suspense, lazy, useEffect } from 'react'
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
  const { canUsePrivateFeatures, loading } = useAuth()

  useEffect(() => {
    if (loading || canUsePrivateFeatures) {
      return
    }

    if (restoreSelectionActiveContext()?.mode === 'project') {
      persistSelectionActiveContext({ mode: 'new' })
    }
  }, [canUsePrivateFeatures, loading])

  if (!canUsePrivateFeatures) {
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
      <PrivateFeatureProviders>{children}</PrivateFeatureProviders>
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
