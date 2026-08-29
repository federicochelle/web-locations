import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const distDirectory = path.join(projectRoot, 'dist')
const outputPath = path.join(distDirectory, 'sitemap.xml')

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function readEnvFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8')
    const entries = new Map()

    for (const line of fileContent.split(/\r?\n/u)) {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmedLine.indexOf('=')

      if (separatorIndex === -1) {
        continue
      }

      const key = trimmedLine.slice(0, separatorIndex).trim()
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim()
      const normalizedValue = rawValue.replace(/^['"]|['"]$/gu, '')

      entries.set(key, normalizedValue)
    }

    return entries
  } catch {
    return new Map()
  }
}

async function loadEnvironment() {
  const envFromFile = await readEnvFile(path.join(projectRoot, '.env'))

  return {
    publicSiteUrl: process.env.VITE_PUBLIC_SITE_URL || envFromFile.get('VITE_PUBLIC_SITE_URL') || '',
    supabaseUrl: process.env.VITE_SUPABASE_URL || envFromFile.get('VITE_SUPABASE_URL') || '',
    supabaseAnonKey:
      process.env.VITE_SUPABASE_ANON_KEY || envFromFile.get('VITE_SUPABASE_ANON_KEY') || '',
  }
}

function normalizeOrigin(rawValue) {
  if (!rawValue) {
    throw new Error(
      'Falta definir VITE_PUBLIC_SITE_URL para generar sitemap.xml.',
    )
  }

  const normalizedValue = rawValue.startsWith('http') ? rawValue : `https://${rawValue}`
  return new URL(normalizedValue).origin
}

async function fetchSupabaseRows({ supabaseUrl, supabaseAnonKey, table, select, filters = [] }) {
  const accumulatedRows = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl)
    url.searchParams.set('select', select)

    for (const [key, value] of filters) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Range: `${from}-${from + pageSize - 1}`,
      },
    })

    if (!response.ok) {
      throw new Error(`No se pudo generar sitemap para ${table}: ${response.status} ${response.statusText}`)
    }

    const pageRows = await response.json()

    if (!Array.isArray(pageRows) || pageRows.length === 0) {
      break
    }

    accumulatedRows.push(...pageRows)

    if (pageRows.length < pageSize) {
      break
    }

    from += pageSize
  }

  return accumulatedRows
}

function buildLocationPath(location) {
  const categorySlug = location.categories?.slug?.trim() ?? ''
  const locationCode = location.location_code?.trim() ?? ''
  const fallbackSlug = location.slug?.trim() ?? ''

  if (categorySlug && locationCode) {
    return `/categorias/${encodeURIComponent(categorySlug)}/${encodeURIComponent(locationCode)}`
  }

  if (fallbackSlug) {
    return `/locations/${encodeURIComponent(fallbackSlug)}`
  }

  return null
}

async function generateSitemap() {
  const { publicSiteUrl, supabaseUrl, supabaseAnonKey } = await loadEnvironment()
  const origin = normalizeOrigin(publicSiteUrl)

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY para generar sitemap.xml.')
  }

  const [categories, locations] = await Promise.all([
    fetchSupabaseRows({
      supabaseUrl,
      supabaseAnonKey,
      table: 'categories',
      select: 'slug',
      filters: [['slug', 'not.is.null']],
    }),
    fetchSupabaseRows({
      supabaseUrl,
      supabaseAnonKey,
      table: 'locations',
      select: 'slug,location_code,categories(slug)',
      filters: [
        ['published', 'eq.true'],
      ],
    }),
  ])

  const currentDate = new Date().toISOString()
  const paths = new Set([
    '/',
    '/nosotros',
    '/postular-locacion',
    '/terminos',
    '/privacidad',
  ])

  for (const category of categories) {
    const slug = category.slug?.trim()

    if (!slug) {
      continue
    }

    paths.add(`/categorias/${encodeURIComponent(slug)}`)
  }

  for (const location of locations) {
    const pathName = buildLocationPath(location)

    if (!pathName) {
      continue
    }

    paths.add(pathName)
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...paths]
      .sort((left, right) => left.localeCompare(right, 'es'))
      .map((pathName) => {
        const absoluteUrl = new URL(pathName, origin).toString()

        return [
          '  <url>',
          `    <loc>${escapeXml(absoluteUrl)}</loc>`,
          `    <lastmod>${currentDate}</lastmod>`,
          '  </url>',
        ].join('\n')
      }),
    '</urlset>',
    '',
  ].join('\n')

  await fs.mkdir(distDirectory, { recursive: true })
  await fs.writeFile(outputPath, xml, 'utf8')
}

try {
  await generateSitemap()
  console.log(`sitemap.xml generado en ${outputPath}`)
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'No se pudo generar sitemap.xml.',
  )
  process.exitCode = 1
}
