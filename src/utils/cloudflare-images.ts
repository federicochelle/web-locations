const CLOUDFLARE_FLEXIBLE_CARD_VARIANT = 'w=640,fit=scale-down,metadata=none'
const CLOUDFLARE_FLEXIBLE_LIGHTBOX_VARIANT = 'w=1600,fit=scale-down,metadata=none'

function isCloudflareImagesPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 3) {
    return segments[2] === 'public'
  }

  if (segments.length === 5) {
    return (
      segments[0] === 'cdn-cgi' &&
      segments[1] === 'imagedelivery' &&
      segments[4] === 'public'
    )
  }

  return false
}

function getCloudflareFlexibleImageUrl(
  imageUrl: string | null | undefined,
  variant: string,
) {
  const trimmedUrl = imageUrl?.trim()

  if (!trimmedUrl) {
    return null
  }

  try {
    const url = new URL(trimmedUrl)

    if (!isCloudflareImagesPath(url.pathname)) {
      return trimmedUrl
    }

    const pathnameSegments = url.pathname.split('/').filter(Boolean)
    pathnameSegments[pathnameSegments.length - 1] = variant
    url.pathname = `/${pathnameSegments.join('/')}`

    return url.toString()
  } catch {
    return trimmedUrl
  }
}

export function getCloudflareCardImageUrl(imageUrl: string | null | undefined) {
  return getCloudflareFlexibleImageUrl(imageUrl, CLOUDFLARE_FLEXIBLE_CARD_VARIANT)
}

export function getCloudflareLightboxImageUrl(imageUrl: string | null | undefined) {
  return getCloudflareFlexibleImageUrl(imageUrl, CLOUDFLARE_FLEXIBLE_LIGHTBOX_VARIANT)
}
