import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { RegisterForm } from '@/components/auth/RegisterForm.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function RegisterPage() {
  usePageTitle('Crear cuenta')

  return (
    <AuthPageShell title="Crear cuenta">
      <RegisterForm />
    </AuthPageShell>
  )
}
