import type { MouseEventHandler } from 'react'

type FavoriteButtonProps = {
  active: boolean
  loading?: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}

export function FavoriteButton({
  active,
  loading = false,
  onClick,
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={onClick}
      disabled={loading}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-70 ${
        active
          ? 'border-white/20 bg-white text-brand-950'
          : 'border-white/20 bg-black/30 text-white hover:bg-white/12'
      }`}
    >
      <span className={`text-lg leading-none ${loading ? 'animate-pulse' : ''}`}>
        {active ? '♥' : '♡'}
      </span>
    </button>
  )
}
