import { useEffect, useState } from 'react'

import { useSignOutAction } from '@/hooks/useSignOutAction.ts'
import { useAuth } from '@/hooks/useAuth.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import {
  getAuthErrorMessage,
  updateUserProfile,
} from '@/services/auth.service.ts'

type ProfileFormValues = {
  fullName: string
  companyName: string
  phone: string
}

export function ProfilePage() {
  usePageTitle('Mi perfil')

  const { plan, profile, refreshProfile, user } = useAuth()
  const { executeSignOut, isSigningOut } = useSignOutAction()
  const [values, setValues] = useState<ProfileFormValues>({
    fullName: '',
    companyName: '',
    phone: '',
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) {
      return
    }

    setValues({
      fullName: profile.fullName ?? '',
      companyName: profile.companyName ?? '',
      phone: profile.phone ?? '',
    })
  }, [profile])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !profile) {
      return
    }

    if (!values.fullName.trim()) {
      setSubmitError('Ingresa tu nombre completo.')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)
      setSuccessMessage(null)

      await updateUserProfile(user.id, {
        fullName: values.fullName.trim(),
        companyName: values.companyName.trim() || null,
        phone: values.phone.trim() || null,
      })

      await refreshProfile()
      setSuccessMessage('Tu perfil fue actualizado correctamente.')
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <h1 className="min-w-0 flex-1 font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:flex-none sm:text-5xl">
              Mi cuenta
            </h1>

            <div className="inline-flex min-h-12 shrink-0 items-center whitespace-nowrap rounded-full border border-brand-300/35 bg-brand-300/18 px-5 text-sm font-semibold text-brand-300 sm:min-h-14 sm:px-6 sm:text-base">
              {plan?.name ?? 'Sin plan activo'}
            </div>
          </div>

          <section className="w-full rounded-none border-x-0 border-y border-white/8 bg-[#1B1B1D] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:rounded-[1rem] sm:border sm:p-6 lg:p-7">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {successMessage ? (
                <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {successMessage}
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {submitError}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
                    Nombre
                  </span>
                  <input
                    type="text"
                    value={values.fullName}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                      setSubmitError(null)
                    }}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                </label>

                <label className="block space-y-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
                    Empresa
                  </span>
                  <input
                    type="text"
                    value={values.companyName}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }))
                      setSubmitError(null)
                    }}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Nombre de tu empresa"
                    autoComplete="organization"
                    disabled={isSubmitting}
                  />
                </label>

                <label className="block space-y-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
                    Email
                  </span>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    className="min-h-13 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-sm text-brand-100/64 outline-none"
                    disabled
                    readOnly
                  />
                </label>

                <label className="block space-y-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
                    Telefono
                  </span>
                  <input
                    type="tel"
                    value={values.phone}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                      setSubmitError(null)
                    }}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Tu telefono"
                    autoComplete="tel"
                    disabled={isSubmitting}
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-12 w-full rounded-full bg-brand-300 px-6 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[220px]"
                >
                  {isSubmitting ? 'Guardando cambios...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>

          <button
            type="button"
            onClick={() => {
              void executeSignOut()
            }}
            disabled={isSigningOut}
            className="min-h-12 w-full rounded-full border border-white/12 bg-white/6 px-6 text-sm font-medium text-brand-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70 sm:hidden"
          >
            {isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </section>
      </div>
    </div>
  )
}
