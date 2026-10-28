import type { CSSProperties } from 'react'

import logoUrl from '../../../logo.webp'

type LocationImageWatermarkProps = {
  className?: string
  style?: CSSProperties
}

export function LocationImageWatermark({ className = '', style }: LocationImageWatermarkProps) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`pointer-events-none absolute bottom-2 right-2 z-[1] h-auto select-none opacity-40 sm:bottom-3 sm:right-3 ${className}`.trim()}
      style={{
        filter: 'brightness(0) invert(1) drop-shadow(0 1px 3px rgb(0 0 0 / 0.45))',
        ...style,
      }}
    />
  )
}
