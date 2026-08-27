import { AppLoading } from '@/components/ui/AppLoading.tsx'

type RouteLoadingFallbackProps = {
  label?: string
}

export function RouteLoadingFallback({
  label = 'Cargando...',
}: RouteLoadingFallbackProps = {}) {
  return (
    <div className="px-4 py-10 sm:py-12">
      <AppLoading label={label} className="mx-auto max-w-sm sm:min-h-[40vh]" />
    </div>
  )
}
