import { useEffect, useState } from 'react'

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

function formatSubscriptionDate(value: string | null) {
  if (!value) {
    return 'Sin fecha definida'
  }

  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ProfilePage() {
  usePageTitle('Mi perfil')

  const { plan, profile, refreshProfile, subscription, user } = useAuth()
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
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
                Perfil
              </p>
              <div className="space-y-2">
                <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                  Mi perfil
                </h1>
                <p className="text-sm leading-6 text-sand-700 sm:text-base">
                  Aqui puedes revisar y actualizar tu informacion basica de contacto.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {successMessage ? (
                <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  {successMessage}
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {submitError}
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Nombre completo
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
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
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
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Nombre de tu empresa"
                  autoComplete="organization"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
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
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Tu telefono"
                  autoComplete="tel"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Email
                </span>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-100 px-4 text-sm text-sand-700 outline-none"
                  disabled
                  readOnly
                />
              </label>

              <div className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-4 py-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                    Plan actual
                  </p>
                  <p className="text-sm text-brand-950">
                    {plan?.name ?? 'Sin plan activo'}
                  </p>
                  <p className="text-sm text-sand-700">
                    Estado: {subscription?.status ?? 'sin suscripcion'}
                  </p>
                  {subscription?.expiresAt ? (
                    <p className="text-sm text-sand-700">
                      Vence: {formatSubscriptionDate(subscription.expiresAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
