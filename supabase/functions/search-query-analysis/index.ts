import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
const MAX_QUERY_LENGTH = 240
const OPENAI_REQUEST_TIMEOUT_MS = 4500
const FEATURE_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000
const CATEGORY_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000
const TAG_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dhKw_HvT0PA5sCLU38PNPg_tBqAlsWM'
const SEARCH_QUERY_ANALYSIS_JSON_SCHEMA = {
  type: 'json_schema',
  name: 'search_query_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      coreQuery: {
        type: 'string',
      },
      optionalTerms: {
        type: 'array',
        items: { type: 'string' },
      },
      categorySlugs: {
        type: 'array',
        items: { type: 'string' },
      },
      featureSlugs: {
        type: 'array',
        items: { type: 'string' },
      },
      tagSlugs: {
        type: 'array',
        items: { type: 'string' },
      },
      freeTextTerms: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'coreQuery',
      'optionalTerms',
      'categorySlugs',
      'featureSlugs',
      'tagSlugs',
      'freeTextTerms',
    ],
  },
} as const

type SearchQueryAnalysisRequest = {
  query?: string
}

type SearchQueryAnalysisResult = {
  coreQuery: string
  optionalTerms: string[]
  categorySlugs: string[]
  featureSlugs: string[]
  tagSlugs: string[]
  freeTextTerms: string[]
}

type FeatureVocabularyRow = {
  name?: string | null
  slug?: string | null
  aliases?: string[] | null
}

type CategoryVocabularyRow = {
  name?: string | null
  slug?: string | null
  aliases?: string[] | null
  location_code_prefix?: string | null
}

type TagVocabularyRow = {
  name?: string | null
  slug?: string | null
  active?: boolean | null
}

type VocabularyOption = {
  aliases: string[]
  canonicalText: string
  locationCodePrefix?: string
  normalizedMatchTerms: string[]
  slug: string
  promptEntry: string
}

let cachedFeatureVocabulary:
  | {
      value: VocabularyOption[]
      expiresAt: number
    }
  | null = null
let cachedCategoryVocabulary:
  | {
      value: VocabularyOption[]
      expiresAt: number
    }
  | null = null
let cachedTagVocabulary:
  | {
      value: VocabularyOption[]
      expiresAt: number
    }
  | null = null
let serviceRoleSupabaseClient: ReturnType<typeof createClient> | null = null
let vocabularySupabaseClient: ReturnType<typeof createClient> | null = null

const FALLBACK_TAG_VOCABULARY = [
  'acero',
  'adobe',
  'altillo',
  'arana',
  'arcos',
  'azotea',
  'balcon',
  'bambu',
  'barra',
  'biblioteca',
  'cafetera-industrial',
  'caja-registradora',
  'carteleria',
  'ceramica',
  'cesped',
  'cesped-sintetico',
  'chapa',
  'chimenea',
  'claraboya',
  'cocina-abierta',
  'columnas',
  'contenedores',
  'cupula',
  'deck',
  'doble-altura',
  'entrepiso',
  'escalera',
  'escalinata',
  'escritorio',
  'estanterias',
  'eucaliptos',
  'flores',
  'fogon',
  'fuente',
  'galeria',
  'galeria-techada',
  'gondolas',
  'granito',
  'heladeras-comerciales',
  'hierro',
  'hormigon',
  'hormigon-visto',
  'horno-de-barro',
  'jardin',
  'ladrillo',
  'lamparas-colgantes',
  'lucernario',
  'luz-natural',
  'madera',
  'maquinaria',
  'marmol',
  'mesa',
  'mesa-larga',
  'mesa-redonda',
  'metal',
  'microcemento',
  'mostrador',
  'muelle',
  'neon',
  'palmeras',
  'parrilla',
  'parrillero',
  'patio',
  'patio-interno',
  'pergola',
  'piedra',
  'pilares',
  'pinos',
  'piscina',
  'puente-grua',
  'red-perimetral',
  'reflectores',
  'sillon',
  'silos',
  'sofa',
  'taburetes',
  'terraza',
  'tribunas',
  'tuberias',
  'ventanales',
  'vestuarios',
  'vidrio',
  'vitrinas',
]

function getEnv(name: string) {
  const value = Deno.env.get(name)?.trim()

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function getOptionalEnv(name: string) {
  return Deno.env.get(name)?.trim() || null
}

function getOpenAiModel() {
  return Deno.env.get('OPENAI_SEARCH_QUERY_ANALYSIS_MODEL')?.trim() || DEFAULT_OPENAI_MODEL
}

function createServiceRoleSupabaseClient() {
  if (serviceRoleSupabaseClient) {
    return serviceRoleSupabaseClient
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!serviceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  serviceRoleSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  })

  return serviceRoleSupabaseClient
}

function createVocabularySupabaseClient() {
  if (vocabularySupabaseClient) {
    return vocabularySupabaseClient
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const clientKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY') || PUBLIC_SUPABASE_PUBLISHABLE_KEY

  vocabularySupabaseClient = createClient(supabaseUrl, clientKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        apikey: clientKey,
        Authorization: `Bearer ${clientKey}`,
      },
    },
  })

  return vocabularySupabaseClient
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No pudimos interpretar la busqueda.'
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeComparableText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueNormalizedTerms(values: string[]) {
  return [...new Set(
    values
      .map((value) => normalizeComparableText(value))
      .filter((value) => value.length > 0),
  )]
}

function buildNormalizedMatchTerms(values: string[]) {
  const normalizedTerms = uniqueNormalizedTerms(values)
  const expandedTerms = new Set<string>()

  for (const normalizedTerm of normalizedTerms) {
    expandedTerms.add(normalizedTerm)

    if (normalizedTerm.endsWith('s') && normalizedTerm.length > 3) {
      expandedTerms.add(normalizedTerm.slice(0, -1))
    } else if (!normalizedTerm.endsWith('s')) {
      expandedTerms.add(`${normalizedTerm}s`)
    }
  }

  return [...expandedTerms].filter((value) => value.length > 0)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesWholePhrase(query: string, phrase: string) {
  return new RegExp(`(^|\\s)${escapeRegExp(phrase)}(?=\\s|$)`, 'u').test(query)
}

function dedupeBySlug(options: VocabularyOption[]) {
  return [...new Map(options.map((option) => [option.slug, option])).values()]
}

const SEMANTIC_DESCRIPTION_CONCEPTS = [
  'amplio',
  'abierto',
  'integrado',
  'techos altos',
  'luminoso',
  'luz natural',
  'calido',
  'oscuro',
  'mucho verde',
  'historico',
  'señorial',
  'deteriorado',
  'abandonado',
  'clasico',
  'moderno',
  'elegante',
  'sobrio',
  'rustico',
  'minimalista',
  'texturado',
].join(', ')

const SUPPORT_TAGS = [
  'jardin',
  'piscina',
  'ladrillo',
  'hormigon',
  'madera',
  'vidrio',
  'metal',
  'piedra',
  'ventanales',
  'chimenea',
  'columnas',
  'luz-natural',
  'patio',
  'terraza',
  'doble-altura',
].join(', ')

async function getFeatureVocabulary() {
  const now = Date.now()

  if (cachedFeatureVocabulary && cachedFeatureVocabulary.expiresAt > now) {
    return cachedFeatureVocabulary.value
  }

  let supabase: ReturnType<typeof createClient>

  try {
    supabase = createVocabularySupabaseClient()
  } catch (error) {
    console.error('[search-query-analysis]', {
      stage: 'service_role_client_init',
      message: getErrorMessage(error),
    })
    throw error
  }

  const { data, error } = await supabase
    .from('features')
    .select('name, slug, aliases')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[search-query-analysis]', {
      stage: 'feature_vocabulary_query',
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(error.message)
  }

  const vocabulary = ((data ?? []) as FeatureVocabularyRow[])
    .map((feature) => {
      const slug = feature.slug?.trim() ?? ''
      const aliases = (feature.aliases ?? [])
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0)
        .slice(0, 3)
      const parts = [
        feature.name?.trim() ?? '',
        slug,
        ...aliases,
      ].filter((part) => part.length > 0)

      if (!slug || parts.length === 0) {
        return null
      }

      return {
        aliases,
        canonicalText: humanizeSlug(slug),
        slug,
        normalizedMatchTerms: buildNormalizedMatchTerms([
          feature.name?.trim() ?? '',
          slug,
          ...aliases,
        ]),
        promptEntry: parts.join(' | '),
      }
    })
    .filter((entry): entry is VocabularyOption => entry !== null)

  cachedFeatureVocabulary = {
    value: vocabulary,
    expiresAt: now + FEATURE_VOCAB_CACHE_TTL_MS,
  }

  return vocabulary
}

function humanizeSlug(slug: string) {
  return slug.replace(/-/g, ' ').trim()
}

async function getCategoryVocabulary() {
  const now = Date.now()

  if (cachedCategoryVocabulary && cachedCategoryVocabulary.expiresAt > now) {
    return cachedCategoryVocabulary.value
  }

  let supabase: ReturnType<typeof createClient>

  try {
    supabase = createVocabularySupabaseClient()
  } catch (error) {
    console.error('[search-query-analysis]', {
      stage: 'service_role_client_init',
      message: getErrorMessage(error),
    })
    throw error
  }

  const { data, error } = await supabase
    .from('categories')
    .select('name, slug, aliases, location_code_prefix')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[search-query-analysis]', {
      stage: 'category_vocabulary_query',
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(error.message)
  }

  const vocabulary = ((data ?? []) as CategoryVocabularyRow[])
    .map((category) => {
      const name = category.name?.trim() ?? ''
      const slug = category.slug?.trim() ?? ''
      const aliases = (category.aliases ?? [])
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0)
        .slice(0, 3)
      const humanizedSlug = slug ? humanizeSlug(slug) : ''
      const parts = [name, humanizedSlug, slug, ...aliases]
        .filter((part) => part.length > 0)
        .filter((part, index, values) => values.indexOf(part) === index)

      if (!slug || parts.length === 0) {
        return null
      }

      return {
        aliases,
        canonicalText: humanizeSlug(slug),
        locationCodePrefix: category.location_code_prefix?.trim() || undefined,
        slug,
        normalizedMatchTerms: buildNormalizedMatchTerms([
          name,
          humanizedSlug,
          slug,
          category.location_code_prefix?.trim() ?? '',
          ...aliases,
        ]),
        promptEntry: parts.join(' | '),
      }
    })
    .filter((entry): entry is VocabularyOption => entry !== null)

  cachedCategoryVocabulary = {
    value: vocabulary,
    expiresAt: now + CATEGORY_VOCAB_CACHE_TTL_MS,
  }

  return vocabulary
}

async function getTagVocabulary() {
  const now = Date.now()

  if (cachedTagVocabulary && cachedTagVocabulary.expiresAt > now) {
    return cachedTagVocabulary.value
  }

  let supabase: ReturnType<typeof createClient>

  try {
    supabase = createServiceRoleSupabaseClient()
  } catch (error) {
    console.error('[search-query-analysis]', {
      stage: 'service_role_client_init',
      message: getErrorMessage(error),
    })
    const fallbackVocabulary = FALLBACK_TAG_VOCABULARY.map((slug) => ({
      aliases: [],
      canonicalText: humanizeSlug(slug),
      slug,
      normalizedMatchTerms: buildNormalizedMatchTerms([slug, humanizeSlug(slug)]),
      promptEntry: `${humanizeSlug(slug)} | ${slug}`,
    }))

    cachedTagVocabulary = {
      value: fallbackVocabulary,
      expiresAt: now + TAG_VOCAB_CACHE_TTL_MS,
    }

    return fallbackVocabulary
  }

  const { data, error } = await supabase
    .from('tags')
    .select('name, slug, active')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[search-query-analysis]', {
      stage: 'tag_vocabulary_query',
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    const fallbackVocabulary = FALLBACK_TAG_VOCABULARY.map((slug) => ({
      aliases: [],
      canonicalText: humanizeSlug(slug),
      slug,
      normalizedMatchTerms: buildNormalizedMatchTerms([slug, humanizeSlug(slug)]),
      promptEntry: `${humanizeSlug(slug)} | ${slug}`,
    }))

    cachedTagVocabulary = {
      value: fallbackVocabulary,
      expiresAt: now + TAG_VOCAB_CACHE_TTL_MS,
    }

    return fallbackVocabulary
  }

  const vocabulary = ((data ?? []) as TagVocabularyRow[])
    .map((tag) => {
      const name = tag.name?.trim() ?? ''
      const slug = tag.slug?.trim() ?? ''
      const humanizedSlug = slug ? humanizeSlug(slug) : ''
      const parts = [name, humanizedSlug, slug]
        .filter((part) => part.length > 0)
        .filter((part, index, values) => values.indexOf(part) === index)

      if (!slug || parts.length === 0) {
        return null
      }

      return {
        aliases: [],
        canonicalText: humanizeSlug(slug),
        slug,
        normalizedMatchTerms: buildNormalizedMatchTerms([name, humanizedSlug, slug]),
        promptEntry: parts.join(' | '),
      }
    })
    .filter((entry): entry is VocabularyOption => entry !== null)

  cachedTagVocabulary = {
    value: vocabulary,
    expiresAt: now + TAG_VOCAB_CACHE_TTL_MS,
  }

  return vocabulary
}

function buildPrompt(
  query: string,
  featureVocabulary: VocabularyOption[],
  categoryVocabulary: VocabularyOption[],
  tagVocabulary: VocabularyOption[],
) {
  return [
    'Sos un sistema que interpreta consultas de visitantes para el buscador publico de locaciones basado en Supabase.',
    'Tu salida se usa para alimentar search_public_locations_v3.',
    'Priorizá español rioplatense/uruguayo natural.',
    'Evitá regionalismos de España poco usados localmente.',
    'Tu salida NO busca locaciones, NO rankea, NO consulta indices externos, NO devuelve IDs y NO responde conversacionalmente.',
    'No recibís descriptions completas ni catálogo de locaciones individuales.',
    'Toda consulta textual del visitante debe ser interpretada, incluso si parece corta, ambigua o parece un código.',
    'No inventes tipologías ni características por asociación.',
    'No reemplaces automáticamente conceptos relacionados que no sean equivalencias directas.',
    'Preservá siempre la tipología explícita del usuario si existe: casa, apartamento, oficina, loft, museo, cancha de fútbol, galpón, etc.',
    'Si la consulta parece apuntar a un código de locación, tratala como una intención válida de búsqueda.',
    'Para códigos, normalizá mayúsculas/minúsculas, espacios y guiones cuando sea razonable.',
    'Para códigos, podés completar ceros a la izquierda solo si la estructura inferida es muy clara y natural para el catálogo, por ejemplo CASA 14 -> CASA-014.',
    'Para códigos, tolerá errores menores de escritura o separación, por ejemplo csa-014, casa014, CASA 014.',
    'Para códigos, no inventes coincidencias inexistentes ni transformes una consulta dudosa en un código específico sin suficiente confianza.',
    'Si no podés inferir con suficiente seguridad un código canónico, preservá la intención original en una forma normalizada pero conservadora.',
    'Si inferís con alta confianza un código canónico, devolvelo en coreQuery como texto canónico, por ejemplo CASA-014.',
    'Evitá generar "nave industrial" o "naves industriales" como vocabulario de salida.',
    'Para espacios industriales, según la intención del usuario, preferí vocabulario natural local: galpón, galpón industrial, depósito, fábrica, antigua fábrica, espacio industrial, predio industrial.',
    'Esto NO autoriza a inventar una tipología que el usuario no expresó.',
    'Si el usuario dice solamente industrial, conservá industrial.',
    'Si el usuario dice galpón, conservá galpón.',
    'Si el usuario dice depósito, no lo reemplaces automáticamente por galpón.',
    'Si el usuario escribe nave industrial, entendelo y mapealo a vocabulario natural local, normalmente galpón industrial, salvo que el contexto indique otra cosa.',
    'Tu objetivo es producir una query textual optimizada para el buscador de locaciones basado en Supabase v3 usando el vocabulario interno real cuando exista.',
    'Usá el catálogo real de features activas para resolver equivalencias concretas. Si el usuario usa un alias y existe un término canónico útil para buscar, preferí ese término canónico en la salida.',
    'Usá también el catálogo real de categorías para conservar o normalizar tipologías al lenguaje que luego matchea category_name o category_aliases.',
    'Usá el catálogo real de tags solo como señal secundaria y complementaria. Los tags no deben dominar la interpretación.',
    'Además de mantener coreQuery y optionalTerms compatibles con V3, devolvé intención estructurada para futuras versiones.',
    'No devuelvas slugs con guiones como forma principal si existe una forma textual natural equivalente.',
    'coreQuery: solo términos principales. Corto, preciso y con alta intención de búsqueda.',
    'coreQuery debe priorizar: 1) tipología o categoría explícita, 2) uno o dos rasgos centrales muy claros, 3) equivalencias canónicas de features si son centrales.',
    'optionalTerms: máximo 3 matices opcionales. Puede ser []. No rellenes por completar.',
    'optionalTerms debe usarse para estilo, atmósfera, materialidad, estado visual, contexto o matices secundarios que ayuden recall sin endurecer demasiado la búsqueda.',
    'No repitas en optionalTerms términos ya presentes en coreQuery.',
    'No agregues ubicación no pedida.',
    'No conviertas conceptos frecuentes en requisitos nuevos.',
    'No conviertas todo a features. Si un concepto funciona mejor como descripción visual, mantenelo como texto descriptivo.',
    'Si un concepto no tiene equivalencia canónica clara en features o categorías, conservá el mejor término descriptivo útil para description.',
    'Si la consulta ya es breve, clara y suficiente, devolvé algo muy cercano al original.',
    'No tratar como sinónimos exactos: biblioteca/librería, techos altos/doble altura, costero/vista al agua, industrial/estructura metálica.',
    'categorySlugs: solo slugs reales de categorías disponibles en este prompt. Si no hay tipología clara o explícita, devolvé [].',
    'featureSlugs: solo slugs reales de features activas disponibles en este prompt. Separá tipología de características.',
    'tagSlugs: solo slugs reales de tags disponibles en este prompt. Son señal secundaria; usalos solo si el concepto aparece de forma clara y el tag existe.',
    'freeTextTerms: conceptos relevantes que no pudieron representarse fielmente mediante categoría, feature o tag. Está pensado para búsqueda futura sobre title, short_description y description.',
    'La IA no puede inventar slugs.',
    'No infieras categorías solo por asociación débil.',
    'No mandes ni asumas descripciones de locaciones concretas.',
    `Conceptos semánticos principales: ${SEMANTIC_DESCRIPTION_CONCEPTS}.`,
    `Tags de apoyo permitidos: ${SUPPORT_TAGS}.`,
    'Categorías reales disponibles:',
    ...categoryVocabulary.map((category) => `- ${category.promptEntry}`),
    'Features reales activas de alto valor semántico. Formato: nombre canónico | forma textual útil | aliases de comprensión:',
    ...featureVocabulary.map((feature) => `- ${feature.promptEntry}`),
    'Tags reales disponibles como señal secundaria:',
    ...tagVocabulary.map((tag) => `- ${tag.promptEntry}`),
    'Ejemplos obligatorios:',
    'Input: quiero una casa antigua con pileta y mucha madera',
    'Output: {"coreQuery":"casa antigua piscina","optionalTerms":["madera"],"categorySlugs":["casas"],"featureSlugs":["piscina"],"tagSlugs":["madera"],"freeTextTerms":["antigua"]}',
    'Input: casa grande con pileta y mucho verde',
    'Output: {"coreQuery":"casa piscina","optionalTerms":["amplio","mucho verde"],"categorySlugs":["casas"],"featureSlugs":["piscina"],"tagSlugs":[],"freeTextTerms":["amplio","mucho verde"]}',
    'Input: algo industrial medio venido abajo',
    'Output: {"coreQuery":"industrial","optionalTerms":["deteriorado"],"categorySlugs":[],"featureSlugs":["industrial"],"tagSlugs":[],"freeTextTerms":["deteriorado"]}',
    'Input: busco una nave industrial grande',
    'Output: {"coreQuery":"galpon industrial","optionalTerms":["amplio"],"categorySlugs":["galpon"],"featureSlugs":["industrial"],"tagSlugs":[],"freeTextTerms":["amplio"]}',
    'Input: galpon viejo con mucha altura',
    'Output: {"coreQuery":"galpon","optionalTerms":["antiguo","techos altos"],"categorySlugs":["galpon"],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":["antiguo","techos altos"]}',
    'Input: deposito industrial',
    'Output: {"coreQuery":"deposito industrial","optionalTerms":[],"categorySlugs":[],"featureSlugs":["deposito","industrial"],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: casa cheta con mucha luz y verde',
    'Output: {"coreQuery":"casa elegante","optionalTerms":["luminoso","mucho verde"],"categorySlugs":["casas"],"featureSlugs":["elegante"],"tagSlugs":[],"freeTextTerms":["luminoso","mucho verde"]}',
    'Input: lugar viejo señorial',
    'Output: {"coreQuery":"señorial","optionalTerms":["antiguo"],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":["señorial","antiguo"]}',
    'Input: espacio amplio con madera',
    'Output: {"coreQuery":"amplio madera","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":["madera"],"freeTextTerms":["amplio"]}',
    'Input: casa moderna con jardín y piscina',
    'Output: {"coreQuery":"casa moderna","optionalTerms":["jardin","piscina"],"categorySlugs":["casas"],"featureSlugs":["moderna","piscina"],"tagSlugs":["jardin"],"freeTextTerms":[]}',
    'Input: cancha de fútbol',
    'Output: {"coreQuery":"cancha de futbol","optionalTerms":[],"categorySlugs":["canchas-de-futbol"],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: museo antiguo',
    'Output: {"coreQuery":"museo antiguo","optionalTerms":[],"categorySlugs":["museos"],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":["antiguo"]}',
    'Input: CASA-014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: CASA 014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: casa 14',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: casa014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: csa-014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: casa con pileta',
    'Output: {"coreQuery":"casa piscina","optionalTerms":[],"categorySlugs":["casas"],"featureSlugs":["piscina"],"tagSlugs":[],"freeTextTerms":[]}',
    'Input: fabrica antigua',
    'Output: {"coreQuery":"fabrica antigua","optionalTerms":[],"categorySlugs":["fabricas"],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":["antigua"]}',
    'Input: lugar con ladrillo, ventanales y mucha luz natural',
    'Output: {"coreQuery":"ladrillo ventanales luz natural","optionalTerms":[],"categorySlugs":[],"featureSlugs":[],"tagSlugs":["ladrillo","ventanales","luz-natural"],"freeTextTerms":[]}',
    'Input: lugar deteriorado con humedad y paredes descascaradas',
    'Output: {"coreQuery":"deteriorado","optionalTerms":["humedad","paredes descascaradas"],"categorySlugs":[],"featureSlugs":[],"tagSlugs":[],"freeTextTerms":["deteriorado","humedad","paredes descascaradas"]}',
    'Respondé JSON estricto con la forma {"coreQuery":"...","optionalTerms":["..."],"categorySlugs":["..."],"featureSlugs":["..."],"tagSlugs":["..."],"freeTextTerms":["..."]} y nada más.',
    `Consulta visitante: ${query}`,
  ].join('\n')
}

function normalizeStringList(value: unknown, limit?: number) {
  const normalized = Array.isArray(value)
    ? value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0)
    : []

  const unique = [...new Set(normalized)]
  return typeof limit === 'number' ? unique.slice(0, limit) : unique
}

function sanitizeSlugList(value: unknown, allowedSlugs: Set<string>) {
  return normalizeStringList(value).filter((slug) => allowedSlugs.has(slug))
}

function extractExplicitMatches(
  normalizedQuery: string,
  options: VocabularyOption[],
  blockedTerms: Set<string>,
) {
  const matches: Array<{
    matchedTerm: string
    option: VocabularyOption
  }> = []

  const sortedOptions = [...options].sort((left, right) => {
    const rightLength = Math.max(...right.normalizedMatchTerms.map((term) => term.length))
    const leftLength = Math.max(...left.normalizedMatchTerms.map((term) => term.length))
    return rightLength - leftLength
  })

  for (const option of sortedOptions) {
    const matchedTerm = option.normalizedMatchTerms.find((term) => {
      if (blockedTerms.has(term) || term.length === 0) {
        return false
      }

      return matchesWholePhrase(normalizedQuery, term)
    })

    if (!matchedTerm) {
      continue
    }

    matches.push({ matchedTerm, option })

    for (const term of option.normalizedMatchTerms) {
      blockedTerms.add(term)
    }
  }

  return matches
}

function removeMatchedTerms(normalizedQuery: string, matchedTerms: string[]) {
  let remaining = ` ${normalizedQuery} `

  for (const matchedTerm of [...matchedTerms].sort((left, right) => right.length - left.length)) {
    remaining = remaining.replace(
      new RegExp(`(^|\\s)${escapeRegExp(matchedTerm)}(?=\\s|$)`, 'gu'),
      ' ',
    )
  }

  return remaining.replace(/\s+/g, ' ').trim()
}

const LOW_SIGNAL_TERMS = new Set([
  'algo',
  'busco',
  'con',
  'de',
  'del',
  'el',
  'en',
  'espacio',
  'la',
  'las',
  'linda',
  'lindo',
  'locacion',
  'locaciones',
  'los',
  'lugar',
  'lugares',
  'medio',
  'mucha',
  'muchas',
  'mucho',
  'muchos',
  'quiero',
  'sitio',
  'tipo',
  'un',
  'una',
  'uno',
  'unas',
  'unos',
  'y',
])

function extractFreeTextTerms(normalizedQuery: string, consumedTerms: string[]) {
  const remainingText = removeMatchedTerms(normalizedQuery, consumedTerms)

  return remainingText
    .split(/\b(?:con|sin|y|e|o|u|pero)\b|,/u)
    .map((chunk) => chunk.trim())
    .map((chunk) =>
      chunk
        .split(/\s+/)
        .filter((term) => term.length > 0 && !LOW_SIGNAL_TERMS.has(term))
        .join(' ')
        .trim()
    )
    .filter((chunk) => chunk.length > 0)
}

function buildCodeLikeCoreQuery(query: string, categoryVocabulary: VocabularyOption[]) {
  const normalizedQuery = normalizeComparableText(query)
  const match = normalizedQuery.match(/^([a-z\s]+?)\s*(\d{1,4})$/u)

  if (!match) {
    return null
  }

  const [, rawPrefix, rawNumber] = match
  const normalizedPrefix = rawPrefix.trim()

  if (!normalizedPrefix || !rawNumber) {
    return null
  }

  const matchedCategory = categoryVocabulary.find((category) =>
    category.normalizedMatchTerms.includes(normalizedPrefix),
  )
  const prefix = matchedCategory?.locationCodePrefix?.trim() || normalizedPrefix.toUpperCase()

  if (!prefix) {
    return null
  }

  return `${prefix.toUpperCase()}-${rawNumber.padStart(3, '0')}`
}

function buildDeterministicInterpretation(
  query: string,
  featureVocabulary: VocabularyOption[],
  categoryVocabulary: VocabularyOption[],
  tagVocabulary: VocabularyOption[],
) {
  const normalizedQuery = normalizeComparableText(query)
  const codeLikeCoreQuery = buildCodeLikeCoreQuery(query, categoryVocabulary)

  if (codeLikeCoreQuery) {
    return {
      coreQuery: codeLikeCoreQuery,
      optionalTerms: [],
      categorySlugs: [],
      featureSlugs: [],
      tagSlugs: [],
      freeTextTerms: [],
    } satisfies SearchQueryAnalysisResult
  }

  const blockedCategoryTerms = new Set<string>()
  const categoryMatches = extractExplicitMatches(
    normalizedQuery,
    categoryVocabulary,
    blockedCategoryTerms,
  )
  const categoryOptions = dedupeBySlug(categoryMatches.map((match) => match.option)).slice(0, 2)
  const consumedCategoryTerms = categoryMatches.map((match) => match.matchedTerm)

  const blockedFeatureTerms = new Set(consumedCategoryTerms)
  const featureMatches = extractExplicitMatches(
    normalizedQuery,
    featureVocabulary,
    blockedFeatureTerms,
  )
  const featureOptions = dedupeBySlug(featureMatches.map((match) => match.option)).slice(0, 3)
  const consumedFeatureTerms = featureMatches.map((match) => match.matchedTerm)

  const blockedTagTerms = new Set([...consumedCategoryTerms, ...consumedFeatureTerms])
  const tagMatches = extractExplicitMatches(normalizedQuery, tagVocabulary, blockedTagTerms)
  const tagOptions = dedupeBySlug(tagMatches.map((match) => match.option)).slice(0, 4)
  const consumedTagTerms = tagMatches.map((match) => match.matchedTerm)

  const freeTextTerms = normalizeStringList(
    extractFreeTextTerms(normalizedQuery, [
      ...consumedCategoryTerms,
      ...consumedFeatureTerms,
      ...consumedTagTerms,
    ]),
  ).slice(0, 4)

  const coreParts = [
    categoryMatches[0]?.matchedTerm ?? '',
    ...featureOptions.slice(0, 2).map((option) => option.canonicalText),
  ].filter((value) => value.length > 0)

  if (coreParts.length === 0 && freeTextTerms.length > 0) {
    coreParts.push(freeTextTerms[0])
  } else if (coreParts.length > 0 && featureOptions.length === 0 && freeTextTerms.length > 0) {
    coreParts.push(freeTextTerms[0])
  }

  if (coreParts.length === 0) {
    coreParts.push(normalizedQuery || normalizeComparableText(query))
  }

  const coreQuery = normalizeQuery(coreParts.join(' ')) || normalizeQuery(query)
  const normalizedCoreParts = new Set(
    coreQuery
      .split(/\s+/)
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length > 0),
  )
  const optionalTerms = [
    ...freeTextTerms.filter((term) => !normalizedCoreParts.has(term.toLowerCase())),
    ...tagOptions
      .map((option) => option.canonicalText)
      .filter((term) => !normalizedCoreParts.has(term.toLowerCase())),
  ].slice(0, 3)

  return {
    coreQuery,
    optionalTerms,
    categorySlugs: categoryOptions.map((option) => option.slug),
    featureSlugs: featureOptions.map((option) => option.slug),
    tagSlugs: tagOptions.map((option) => option.slug),
    freeTextTerms,
  } satisfies SearchQueryAnalysisResult
}

function parseSearchInterpretationFromOpenAiResponse(payload: unknown) {
  const typedPayload = payload as {
    status?: string
    error?: {
      message?: string
    } | null
    output_text?: string
    output?: Array<{
      content?: Array<{
        text?: string
      }>
    }>
  } | null

  if (typedPayload?.status === 'failed') {
    throw new Error(typedPayload.error?.message || 'OpenAI failed to generate the response.')
  }

  const outputText =
    typedPayload?.output_text ??
    typedPayload?.output?.[0]?.content?.[0]?.text

  if (typeof outputText !== 'string' || outputText.trim().length === 0) {
    throw new Error('OpenAI did not return output_text.')
  }

  let parsed: SearchQueryAnalysisResult | null = null

  try {
    parsed = JSON.parse(outputText) as SearchQueryAnalysisResult
  } catch {
    throw new Error('OpenAI returned invalid JSON.')
  }

  const coreQuery = parsed.coreQuery?.trim()
  const optionalTerms = Array.isArray(parsed.optionalTerms)
    ? normalizeStringList(parsed.optionalTerms, 3)
    : null

  if (!coreQuery) {
    throw new Error('OpenAI returned an empty coreQuery.')
  }

  if (!optionalTerms) {
    throw new Error('OpenAI returned invalid optionalTerms.')
  }

  return {
    coreQuery,
    optionalTerms,
    categorySlugs: normalizeStringList(parsed.categorySlugs),
    featureSlugs: normalizeStringList(parsed.featureSlugs),
    tagSlugs: normalizeStringList(parsed.tagSlugs),
    freeTextTerms: normalizeStringList(parsed.freeTextTerms),
  } satisfies SearchQueryAnalysisResult
}

function sanitizeSearchInterpretation(
  interpretation: SearchQueryAnalysisResult,
  allowedCategorySlugs: Set<string>,
  allowedFeatureSlugs: Set<string>,
  allowedTagSlugs: Set<string>,
) {
  return {
    coreQuery: interpretation.coreQuery,
    optionalTerms: interpretation.optionalTerms,
    categorySlugs: sanitizeSlugList(interpretation.categorySlugs, allowedCategorySlugs),
    featureSlugs: sanitizeSlugList(interpretation.featureSlugs, allowedFeatureSlugs),
    tagSlugs: sanitizeSlugList(interpretation.tagSlugs, allowedTagSlugs),
    freeTextTerms: normalizeStringList(interpretation.freeTextTerms),
  } satisfies SearchQueryAnalysisResult
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return createJsonResponse({ error: 'Metodo no permitido.' }, 405)
  }

  try {
    const body = (await request.json()) as SearchQueryAnalysisRequest
    const query = normalizeQuery(body.query ?? '')
    const [featureVocabulary, categoryVocabulary, tagVocabulary] = await Promise.all([
      getFeatureVocabulary(),
      getCategoryVocabulary(),
      getTagVocabulary(),
    ])

    if (!query) {
      return createJsonResponse({ error: 'La query es obligatoria.' }, 400)
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return createJsonResponse(
        { error: `La query no puede superar ${MAX_QUERY_LENGTH} caracteres.` },
        400,
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS)
    const fallbackInterpretation = sanitizeSearchInterpretation(
      buildDeterministicInterpretation(
        query,
        featureVocabulary,
        categoryVocabulary,
        tagVocabulary,
      ),
      new Set(categoryVocabulary.map((entry) => entry.slug)),
      new Set(featureVocabulary.map((entry) => entry.slug)),
      new Set(tagVocabulary.map((entry) => entry.slug)),
    )

    try {
      try {
        const response = await fetch(OPENAI_RESPONSES_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getEnv('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: getOpenAiModel(),
            input: buildPrompt(query, featureVocabulary, categoryVocabulary, tagVocabulary),
            text: {
              format: SEARCH_QUERY_ANALYSIS_JSON_SCHEMA,
            },
          }),
          signal: controller.signal,
        })

        const payload = await response.json()

        if (!response.ok) {
          console.error('[search-query-analysis]', {
            stage: 'openai_response',
            status: response.status,
            payload,
          })

          return createJsonResponse(fallbackInterpretation)
        }

        let interpretation: SearchQueryAnalysisResult

        try {
          interpretation = parseSearchInterpretationFromOpenAiResponse(payload)
        } catch (error) {
          console.error('[search-query-analysis]', {
            stage: 'openai_parse_fallback',
            message: getErrorMessage(error),
            payload,
          })

          interpretation = fallbackInterpretation
        }

        const sanitizedInterpretation = sanitizeSearchInterpretation(
          interpretation,
          new Set(categoryVocabulary.map((entry) => entry.slug)),
          new Set(featureVocabulary.map((entry) => entry.slug)),
          new Set(tagVocabulary.map((entry) => entry.slug)),
        )

        return createJsonResponse(sanitizedInterpretation)
      } catch (error) {
        console.error('[search-query-analysis]', {
          stage: 'openai_request_fallback',
          message: getErrorMessage(error),
        })

        return createJsonResponse(fallbackInterpretation)
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('[search-query-analysis]', {
      stage: 'unhandled_error',
      message: getErrorMessage(error),
    })

    return createJsonResponse(
      { error: 'No pudimos interpretar la busqueda en este momento.' },
      500,
    )
  }
})
