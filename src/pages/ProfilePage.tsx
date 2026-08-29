import { useEffect, useState } from 'react'

import submissionFooterBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (1).webp'
import submissionHeaderBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (2).webp'
import { PhoneInput } from '@/components/ui/PhoneInput.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { usePageSeo } from '@/hooks/usePageSeo.ts'
import { useSignOutAction } from '@/hooks/useSignOutAction.ts'
import {
  getAuthErrorMessage,
  updateUserProfile,
} from '@/services/auth.service.ts'
import {
  getPhoneError,
  normalizePhoneForInput,
  normalizePhoneForStorage,
} from '@/utils/phone.ts'

type ProfileFormValues = {
  fullName: string
  companyName: string
  phone?: string
}

const formPanelOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const formPanelHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

const formPrimaryButtonClassName =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-4.5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]'

function FormActionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
    </svg>
  )
}

export function ProfilePage() {
  usePageSeo({
    title: 'Mi perfil',
    description: 'Perfil privado de Film Locations Uruguay.',
    canonicalPath: '/profile',
    robots: 'noindex,nofollow',
  })

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
      phone: normalizePhoneForInput(profile.phone),
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

    const phoneError = getPhoneError(values.phone)

    if (phoneError) {
      setSubmitError(phoneError)
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)
      setSuccessMessage(null)

      await updateUserProfile(user.id, {
        fullName: values.fullName.trim(),
        companyName: values.companyName.trim() || null,
        phone: normalizePhoneForStorage(values.phone),
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
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-0 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
          <form className="w-full" onSubmit={handleSubmit}>
            <section className="overflow-hidden rounded-[0.3rem] border border-white/10 bg-white/4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur-[2px]">
              <header className="relative overflow-hidden border-b border-white/10">
                <div className="absolute inset-0" aria-hidden="true">
                  <img
                    src={submissionHeaderBackgroundUrl}
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-black/46" />
                  <div className={formPanelOverlayClassName} />
                  <div className={formPanelHighlightClassName} />
                </div>
                <div className="relative px-5 py-3.5 sm:px-6 sm:py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                    <h1 className="font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.35rem]">
                      Mi cuenta
                    </h1>
                    <div className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border border-brand-200/60 bg-brand-300/30 px-4 text-sm font-semibold text-brand-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:min-h-11 sm:px-5 sm:text-base">
                      {plan?.name ?? 'Sin plan activo'}
                    </div>
                  </div>
                </div>
              </header>

              <div className="space-y-8 px-5 py-5 sm:space-y-10 sm:px-6">
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

                <section className="space-y-6">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
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

                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
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

                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
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

                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                        Telefono
                      </span>
                      <PhoneInput
                        value={values.phone}
                        onChange={(nextValue) => {
                          setValues((current) => ({
                            ...current,
                            phone: nextValue,
                          }))
                          setSubmitError(null)
                        }}
                        placeholder="099 123 456"
                        autoComplete="tel"
                        disabled={isSubmitting}
                        variant="profile"
                      />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="relative overflow-hidden border-t border-white/10">
                <div className="absolute inset-0" aria-hidden="true">
                  <img
                    src={submissionFooterBackgroundUrl}
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-black/46" />
                  <div className={formPanelOverlayClassName} />
                  <div className={formPanelHighlightClassName} />
                </div>
                <div className="relative px-5 py-3.5 sm:px-6 sm:py-4">
                  <div className="flex justify-end">
                    <div className="w-full sm:w-auto sm:min-w-[248px]">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={formPrimaryButtonClassName}
                      >
                        <FormActionIcon />
                        {isSubmitting ? 'Guardando cambios...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              </footer>
            </section>
          </form>

          <div className="px-4 md:hidden">
            <button
              type="button"
              onClick={() => {
                void executeSignOut()
              }}
              disabled={isSigningOut}
              className={formPrimaryButtonClassName}
            >
              <SignOutIcon />
              {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
