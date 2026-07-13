import { RegisterForm } from '@/components/auth/RegisterForm.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function RegisterPage() {
  usePageTitle('Crear cuenta')

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-[1720px] items-center justify-center">
        <section className="w-full max-w-[460px] rounded-[0.875rem] border border-white/8 bg-[#1B1B1D] px-6 py-8 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-8">
          <div className="mb-8 space-y-3">
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100">
              Crear cuenta
            </h1>
          </div>

          <RegisterForm />
        </section>
      </div>
    </div>
  )
}
