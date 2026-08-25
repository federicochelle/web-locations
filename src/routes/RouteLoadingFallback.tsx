import { AppLoading } from '@/components/ui/AppLoading.tsx'

export function RouteLoadingFallback() {
  return (
    <div className="px-4 py-10 sm:py-12">
      <AppLoading label="Cargando..." className="mx-auto max-w-sm sm:min-h-[40vh]" />
    </div>
  )
}
