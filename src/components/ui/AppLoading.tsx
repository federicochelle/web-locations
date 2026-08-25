import logoUrl from '../../../logo.webp'

type AppLoadingProps = {
  label?: string
  className?: string
  compact?: boolean
}

export function AppLoading({
  label = 'Cargando...',
  className = '',
  compact = false,
}: AppLoadingProps) {
  const iconSizeClassName = compact ? 'h-12 w-12' : 'h-14 w-14'
  const logoSizeClassName = compact ? 'h-6 w-6' : 'h-7 w-7'
  const containerClassName = compact
    ? 'min-h-[10rem] rounded-[1.5rem] px-5 py-6'
    : 'min-h-[14rem] rounded-[1.75rem] px-6 py-8'

  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-4 border border-white/10 bg-white/6 text-center shadow-[0_18px_34px_rgba(0,0,0,0.12)] ${containerClassName} ${className}`.trim()}
    >
      <div
        className={`relative flex items-center justify-center rounded-full border border-white/10 bg-black/18 ${iconSizeClassName}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-brand-300/18 border-t-brand-300 animate-spin motion-reduce:animate-none"
        />
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className={`${logoSizeClassName} object-contain opacity-90`}
          decoding="async"
        />
      </div>
      <p className="text-sm font-medium text-brand-100/86">{label}</p>
    </div>
  )
}
