export const SITE_NAME = 'Film Locations Uruguay'
export const SITE_LOCALE = 'es_UY'
export const DEFAULT_THEME_COLOR = '#0b0908'
export const DEFAULT_OG_IMAGE_PATH = '/favicon.svg'
export const DEFAULT_PAGE_TITLE = SITE_NAME
export const DEFAULT_PAGE_DESCRIPTION =
  'Explorá locaciones para producciones audiovisuales en Uruguay. Descubrí espacios únicos para cine, fotografía, publicidad y proyectos creativos.'

export function getPublicSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()

  if (!configuredOrigin) {
    return null
  }

  try {
    return new URL(configuredOrigin).origin
  } catch {
    return null
  }
}

export function buildAbsolutePublicUrl(path: string) {
  const origin = getPublicSiteOrigin()

  if (!origin) {
    return null
  }

  return new URL(path, origin).toString()
}

export function normalizeSeoDescription(value: string | null | undefined) {
  const normalizedValue = value?.replace(/\s+/g, ' ').trim() ?? ''
  return normalizedValue.length > 0 ? normalizedValue : DEFAULT_PAGE_DESCRIPTION
}
