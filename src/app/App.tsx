import { RecoveryNotice } from '@/version-recovery/RecoveryNotice.tsx'
import { SelectionDebugPanel } from '@/components/selection/SelectionDebugPanel.tsx'
import { AuthProvider } from '@/providers/AuthProvider.tsx'
import { ImageSelectionProvider } from '@/providers/ImageSelectionProvider.tsx'
import { RequestProjectsProvider } from '@/providers/RequestProjectsProvider.tsx'
import { AppRouter } from '@/routes/AppRouter.tsx'

export function App() {
  return (
    <>
      <RecoveryNotice />
      <AuthProvider>
        <RequestProjectsProvider>
          <ImageSelectionProvider>
            <AppRouter />
            <SelectionDebugPanel />
          </ImageSelectionProvider>
        </RequestProjectsProvider>
      </AuthProvider>
    </>
  )
}
