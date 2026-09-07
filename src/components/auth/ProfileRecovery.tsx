import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth.ts'
import { useSignOutAction } from '@/hooks/useSignOutAction.ts'

export function ProfileRecovery({ unavailable = false }: { unavailable?: boolean }) {
  const { profileState, refreshProfile } = useAuth()
  const { executeSignOut, isSigningOut } = useSignOutAction()
  const [logoutError, setLogoutError] = useState(false)
  const missing = profileState === 'missing'

  async function handleSignOut() {
    setLogoutError(false)
    try {
      await executeSignOut()
    } catch {
      setLogoutError(true)
    }
  }

  return (
    <section className="mx-auto my-10 w-full max-w-xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 text-brand-950 shadow-xl sm:px-8">
      <h1 className="font-display text-3xl font-semibold">
        {unavailable ? 'Acceso no disponible' : missing ? 'No pudimos encontrar tu perfil' : 'No pudimos cargar tu cuenta'}
      </h1>
      <p className="mt-4 text-sm leading-6 text-sand-700">
        {unavailable
          ? 'El estado actual de tu cuenta no permite acceder a las funciones privadas.'
          : missing
            ? 'Tu sesión está activa, pero tu cuenta no está disponible. Podés reintentar o cerrar sesión.'
            : 'Ocurrió un problema al consultar tu cuenta. Podés reintentar sin cerrar tu sesión.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {!unavailable && <button type="button" disabled={isSigningOut} onClick={() => { void refreshProfile() }}
          className="min-h-12 rounded-2xl bg-brand-500 px-5 text-white disabled:opacity-50">Reintentar</button>}
        <button type="button" disabled={isSigningOut} onClick={() => { void handleSignOut() }}
          className="min-h-12 rounded-2xl border border-brand-500 px-5 disabled:opacity-50">
          {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
      {logoutError && <p role="alert" className="mt-4 text-sm text-red-700">No pudimos cerrar la sesión. Intentá nuevamente.</p>}
    </section>
  )
}
