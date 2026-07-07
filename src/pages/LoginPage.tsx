import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function LoginPage() {
  usePageTitle('Iniciar sesion')

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto flex max-w-[1720px] justify-center">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
              Acceso
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Iniciar sesion
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Accede a tu cuenta para continuar explorando la plataforma.
              </p>
            </div>
          </div>

          <LoginForm />
        </section>
      </div>
    </div>
  )
}
