import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function LoginPage() {
  usePageTitle('Iniciar sesión')

  return (
    <AuthPageShell title="Iniciar sesión">
      <LoginForm />
    </AuthPageShell>
  )
}
