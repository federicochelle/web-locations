import { AuthProvider } from '@/providers/AuthProvider.tsx'
import { ImageSelectionProvider } from '@/providers/ImageSelectionProvider.tsx'
import { AppRouter } from '@/routes/AppRouter.tsx'

export function App() {
  return (
    <AuthProvider>
      <ImageSelectionProvider>
        <AppRouter />
      </ImageSelectionProvider>
    </AuthProvider>
  )
}
