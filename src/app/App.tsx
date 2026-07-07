import { AuthProvider } from '@/providers/AuthProvider.tsx'
import { AppRouter } from '@/routes/AppRouter.tsx'

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
