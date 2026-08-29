import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
const MAX_QUERY_LENGTH = 240
const OPENAI_REQUEST_TIMEOUT_MS = 4500
const FEATURE_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000
const CATEGORY_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000

type SearchQueryAnalysisRequest = {
  query?: string
}

type SearchQueryAnalysisResult = {
  coreQuery: string
  optionalTerms: string[]
}

type FeatureVocabularyRow = {
  name?: string | null
  slug?: string | null
  aliases?: string[] | null
}

type CategoryVocabularyRow = {
  name?: string | null
  slug?: string | null
}

let cachedFeatureVocabulary:
  | {
      value: string[]
      expiresAt: number
    }
  | null = null
let cachedCategoryVocabulary:
  | {
      value: string[]
      expiresAt: number
    }
  | null = null
let serviceRoleSupabaseClient: ReturnType<typeof createClient> | null = null

function getEnv(name: string) {
  const value = Deno.env.get(name)?.trim()

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function getOpenAiModel() {
  return Deno.env.get('OPENAI_SEARCH_QUERY_ANALYSIS_MODEL')?.trim() || DEFAULT_OPENAI_MODEL
}

function createServiceRoleSupabaseClient() {
  if (serviceRoleSupabaseClient) {
    return serviceRoleSupabaseClient
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No pudimos interpretar la busqueda.'
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ')
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
    supabase = createServiceRoleSupabaseClient()
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
      const aliases = (feature.aliases ?? [])
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0)
        .slice(0, 3)
      const parts = [
        feature.name?.trim() ?? '',
        feature.slug?.trim() ?? '',
        ...aliases,
      ].filter((part) => part.length > 0)

      if (parts.length === 0) {
        return null
      }

      return parts.join(' | ')
    })
    .filter((entry): entry is string => entry !== null)

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
    supabase = createServiceRoleSupabaseClient()
  } catch (error) {
    console.error('[search-query-analysis]', {
      stage: 'service_role_client_init',
      message: getErrorMessage(error),
    })
    throw error
  }

  const { data, error } = await supabase
    .from('categories')
    .select('name, slug')
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
      const humanizedSlug = slug ? humanizeSlug(slug) : ''
      const parts = [name, humanizedSlug, slug]
        .filter((part) => part.length > 0)
        .filter((part, index, values) => values.indexOf(part) === index)

      if (parts.length === 0) {
        return null
      }

      return parts.join(' | ')
    })
    .filter((entry): entry is string => entry !== null)

  cachedCategoryVocabulary = {
    value: vocabulary,
    expiresAt: now + CATEGORY_VOCAB_CACHE_TTL_MS,
  }

  return vocabulary
}

function buildPrompt(
  query: string,
  featureVocabulary: string[],
  categoryVocabulary: string[],
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
    `Conceptos semánticos principales: ${SEMANTIC_DESCRIPTION_CONCEPTS}.`,
    `Tags de apoyo permitidos: ${SUPPORT_TAGS}.`,
    'Categorías reales disponibles:',
    ...categoryVocabulary.map((category) => `- ${category}`),
    'Features reales activas de alto valor semántico. Formato: nombre canónico | forma textual útil | aliases de comprensión:',
    ...featureVocabulary.map((feature) => `- ${feature}`),
    'Ejemplos obligatorios:',
    'Input: quiero una casa antigua con pileta y mucha madera',
    'Output: {"coreQuery":"casa antigua piscina","optionalTerms":["madera"]}',
    'Input: casa grande con pileta y mucho verde',
    'Output: {"coreQuery":"casa piscina","optionalTerms":["amplio","mucho verde"]}',
    'Input: algo industrial medio venido abajo',
    'Output: {"coreQuery":"industrial","optionalTerms":["deteriorado"]}',
    'Input: busco una nave industrial grande',
    'Output: {"coreQuery":"galpon industrial","optionalTerms":["amplio"]}',
    'Input: galpon viejo con mucha altura',
    'Output: {"coreQuery":"galpon","optionalTerms":["antiguo","techos altos"]}',
    'Input: deposito industrial',
    'Output: {"coreQuery":"deposito industrial","optionalTerms":[]}',
    'Input: casa cheta con mucha luz y verde',
    'Output: {"coreQuery":"casa elegante","optionalTerms":["luminoso","mucho verde"]}',
    'Input: lugar viejo señorial',
    'Output: {"coreQuery":"señorial","optionalTerms":["antiguo"]}',
    'Input: espacio amplio con madera',
    'Output: {"coreQuery":"amplio madera","optionalTerms":[]}',
    'Input: casa moderna con jardín y piscina',
    'Output: {"coreQuery":"casa moderna","optionalTerms":["jardin","piscina"]}',
    'Input: cancha de fútbol',
    'Output: {"coreQuery":"cancha de futbol","optionalTerms":[]}',
    'Input: museo antiguo',
    'Output: {"coreQuery":"museo antiguo","optionalTerms":[]}',
    'Input: CASA-014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[]}',
    'Input: CASA 014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[]}',
    'Input: casa 14',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[]}',
    'Input: casa014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[]}',
    'Input: csa-014',
    'Output: {"coreQuery":"CASA-014","optionalTerms":[]}',
    'Input: casa con pileta',
    'Output: {"coreQuery":"casa piscina","optionalTerms":[]}',
    'Respondé JSON estricto con la forma {"coreQuery":"...","optionalTerms":["..."]} y nada más.',
    `Consulta visitante: ${query}`,
  ].join('\n')
}

function parseSearchInterpretationFromOpenAiResponse(payload: unknown) {
  const typedPayload = payload as {
    output_text?: string
    output?: Array<{
      content?: Array<{
        text?: string
      }>
    }>
  } | null
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
    ? parsed.optionalTerms
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
      .slice(0, 3)
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
    const [featureVocabulary, categoryVocabulary] = await Promise.all([
      getFeatureVocabulary(),
      getCategoryVocabulary(),
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

    try {
      const response = await fetch(OPENAI_RESPONSES_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getEnv('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getOpenAiModel(),
          input: buildPrompt(query, featureVocabulary, categoryVocabulary),
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

        return createJsonResponse(
          { error: 'No pudimos interpretar la busqueda en este momento.' },
          502,
        )
      }

      const interpretation = parseSearchInterpretationFromOpenAiResponse(payload)

      return createJsonResponse(interpretation)
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
