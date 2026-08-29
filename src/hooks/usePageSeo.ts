import { useEffect } from 'react'

import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_PAGE_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  SITE_LOCALE,
  SITE_NAME,
  buildAbsolutePublicUrl,
  normalizeSeoDescription,
} from '@/utils/seo.ts'

type PageSeoOptions = {
  title?: string
  description?: string | null
  canonicalPath?: string | null
  robots?: string
  ogTitle?: string
  ogDescription?: string | null
  ogImagePath?: string
  ogType?: 'website' | 'article'
  twitterCard?: 'summary' | 'summary_large_image'
}

function upsertMetaByName(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    element.setAttribute('data-seo-managed', 'true')
    document.head.append(element)
  }

  element.setAttribute('content', content)
}

function removeMetaByName(name: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.remove()
}

function upsertMetaByProperty(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    element.setAttribute('data-seo-managed', 'true')
    document.head.append(element)
  }

  element.setAttribute('content', content)
}

function removeMetaByProperty(property: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.remove()
}

function upsertCanonical(href: string | null) {
  const existingElement = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!href) {
    existingElement?.remove()
    return
  }

  if (existingElement) {
    existingElement.setAttribute('href', href)
    return
  }

  const element = document.createElement('link')
  element.setAttribute('rel', 'canonical')
  element.setAttribute('href', href)
  element.setAttribute('data-seo-managed', 'true')
  document.head.append(element)
}

export function usePageSeo({
  title,
  description,
  canonicalPath = null,
  robots = 'index,follow',
  ogTitle,
  ogDescription,
  ogImagePath = DEFAULT_OG_IMAGE_PATH,
  ogType = 'website',
  twitterCard = 'summary',
}: PageSeoOptions) {
  useEffect(() => {
    const normalizedTitle = title?.trim() ?? ''
    const pageTitle = normalizedTitle
      ? normalizedTitle === SITE_NAME
        ? SITE_NAME
        : `${normalizedTitle} | ${SITE_NAME}`
      : DEFAULT_PAGE_TITLE
    const pageDescription = normalizeSeoDescription(description ?? DEFAULT_PAGE_DESCRIPTION)
    const canonicalUrl = canonicalPath ? buildAbsolutePublicUrl(canonicalPath) : null
    const resolvedOgTitle = ogTitle?.trim() || pageTitle
    const resolvedOgDescription = normalizeSeoDescription(ogDescription ?? pageDescription)
    const resolvedOgImage = buildAbsolutePublicUrl(ogImagePath)

    document.title = pageTitle

    upsertMetaByName('description', pageDescription)
    upsertMetaByName('robots', robots)
    upsertCanonical(canonicalUrl)

    upsertMetaByProperty('og:title', resolvedOgTitle)
    upsertMetaByProperty('og:description', resolvedOgDescription)
    upsertMetaByProperty('og:type', ogType)
    upsertMetaByProperty('og:site_name', SITE_NAME)
    upsertMetaByProperty('og:locale', SITE_LOCALE)

    if (canonicalUrl) {
      upsertMetaByProperty('og:url', canonicalUrl)
    } else {
      removeMetaByProperty('og:url')
    }

    if (resolvedOgImage) {
      upsertMetaByProperty('og:image', resolvedOgImage)
    } else {
      removeMetaByProperty('og:image')
    }

    upsertMetaByName('twitter:card', twitterCard)
    upsertMetaByName('twitter:title', resolvedOgTitle)
    upsertMetaByName('twitter:description', resolvedOgDescription)

    if (resolvedOgImage) {
      upsertMetaByName('twitter:image', resolvedOgImage)
    } else {
      removeMetaByName('twitter:image')
    }
  }, [
    canonicalPath,
    description,
    ogDescription,
    ogImagePath,
    ogTitle,
    ogType,
    robots,
    title,
    twitterCard,
  ])
}
