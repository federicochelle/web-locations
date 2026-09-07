import { useSyncExternalStore } from 'react'
import { recovery } from './browser.ts'
import { hasUnsavedCriticalState } from './dirty-state.ts'

export function RecoveryNotice() {
  const state = useSyncExternalStore(recovery.subscribe, recovery.getSnapshot)
  if (state === 'idle') return null
  const dirty = state === 'blocked_dirty_state'
  return (
    <aside role="alert" aria-live="assertive" className="fixed inset-x-3 top-3 z-[10000] mx-auto max-w-xl rounded-xl border border-amber-300 bg-white p-5 text-gray-950 shadow-xl">
      <p>{state === 'reloading' ? 'Estamos actualizando la página…' : dirty
        ? 'Hay una nueva versión disponible. Guardá tu trabajo antes de actualizar.'
        : 'No pudimos cargar esta parte de la aplicación. Actualizá la página para continuar.'}</p>
      {state !== 'reloading' && <button type="button" className="mt-3 rounded-lg bg-black px-4 py-2 text-white" onClick={() => {
        if ((dirty || hasUnsavedCriticalState()) && !window.confirm('Actualizar puede descartar cambios sin guardar. ¿Querés continuar?')) return
        window.location.reload()
      }}>Actualizar ahora</button>}
    </aside>
  )
}
