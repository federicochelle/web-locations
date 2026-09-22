export const SITE_NAME = 'Sitio Locaciones'
export const SITE_LOCALE = 'es_UY'
export const DEFAULT_THEME_COLOR = '#0b0908'
export const DEFAULT_OG_IMAGE_PATH = '/opengraph.jpeg'
export const DEFAULT_OG_IMAGE_WIDTH = 1842
export const DEFAULT_OG_IMAGE_HEIGHT = 854
export const DEFAULT_OG_IMAGE_ALT =
  'Vista de locaciones destacadas en Sitio Locaciones'
export const DEFAULT_PAGE_TITLE = SITE_NAME
export const DEFAULT_PAGE_DESCRIPTION =
  'Explorá locaciones profesionales para producciones audiovisuales, fotografía, publicidad y proyectos creativos.'

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
