import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { usePageSeo } from '@/hooks/usePageSeo.ts'

export function LoginPage() {
  usePageSeo({
    title: 'Iniciar sesión',
    description: 'Ingresá a tu cuenta de Film Locations Uruguay.',
    canonicalPath: '/login',
    robots: 'noindex,nofollow',
  })

  return (
    <AuthPageShell title="Iniciar sesión">
      <LoginForm />
    </AuthPageShell>
  )
}
