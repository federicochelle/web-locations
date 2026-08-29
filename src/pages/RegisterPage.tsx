import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { RegisterForm } from '@/components/auth/RegisterForm.tsx'
import { usePageSeo } from '@/hooks/usePageSeo.ts'

export function RegisterPage() {
  usePageSeo({
    title: 'Crear cuenta',
    description: 'Creá tu cuenta para acceder a Film Locations Uruguay.',
    canonicalPath: '/register',
    robots: 'noindex,nofollow',
  })

  return (
    <AuthPageShell title="Crear cuenta">
      <RegisterForm />
    </AuthPageShell>
  )
}
