import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

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

export function DashboardPage() {
  usePageTitle('Panel del visitante')

  const { hasActiveSubscription, plan, profile, subscription, user } = useAuth()
  const displayName = profile?.fullName?.trim() || user?.email || 'visitante'

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
                Panel del visitante
              </p>
              <div className="space-y-2">
                <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                  Bienvenido, {displayName}
                </h1>
                <p className="text-sm leading-6 text-sand-700 sm:text-base">
                  Desde aqui puedes continuar explorando locaciones y revisar tu informacion basica.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                to="/locations"
                className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-5 py-5 text-sm text-brand-950 transition hover:bg-sand-100"
              >
                Explorar locaciones
              </Link>
              <Link
                to="/profile"
                className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-5 py-5 text-sm text-brand-950 transition hover:bg-sand-100"
              >
                Mi perfil
              </Link>
              <Link
                to="/favorites"
                className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-5 py-5 text-sm text-brand-950 transition hover:bg-sand-100"
              >
                Favoritos
              </Link>
            </div>

            <section className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-5 py-5">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Suscripcion
                </p>
                <h2 className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-950">
                  {plan?.name ?? 'Sin plan activo'}
                </h2>
                <p className="text-sm text-sand-700">
                  Estado: {subscription?.status ?? 'sin suscripcion'}
                </p>
                {subscription?.expiresAt ? (
                  <p className="text-sm text-sand-700">
                    Vence: {formatSubscriptionDate(subscription.expiresAt)}
                  </p>
                ) : null}
                {!hasActiveSubscription ? (
                  <p className="text-sm text-sand-700">
                    Tu cuenta no tiene una suscripcion activa en este momento.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
