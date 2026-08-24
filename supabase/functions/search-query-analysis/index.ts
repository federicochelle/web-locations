import { corsHeaders, createJsonResponse } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
const MAX_QUERY_LENGTH = 240
const OPENAI_REQUEST_TIMEOUT_MS = 4500
const FEATURE_VOCAB_CACHE_TTL_MS = 10 * 60 * 1000

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

let cachedFeatureVocabulary:
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

function buildPrompt(query: string, featureVocabulary: string[]) {
  return [
    'Sos un sistema que traduce consultas de visitantes al mismo lenguaje semántico usado en descriptions internas de locaciones.',
    'Priorizá español rioplatense/uruguayo natural.',
    'Evitá regionalismos de España poco usados localmente.',
    'Tu salida NO busca locaciones, NO rankea, NO devuelve IDs y NO responde conversacionalmente.',
    'No recibís descriptions completas ni catálogo de locaciones.',
    'No inventes tipologías ni características por asociación.',
    'No reemplaces automáticamente conceptos relacionados que no sean equivalencias directas.',
    'Preservá siempre la tipología explícita del usuario si existe: casa, apartamento, oficina, loft, etc.',
    'Evitá generar "nave industrial" o "naves industriales" como vocabulario de salida.',
    'Para espacios industriales, según la intención del usuario, preferí vocabulario natural local: galpón, galpón industrial, depósito, fábrica, antigua fábrica, espacio industrial, predio industrial.',
    'Esto NO autoriza a inventar una tipología que el usuario no expresó.',
    'Si el usuario dice solamente industrial, conservá industrial.',
    'Si el usuario dice galpón, conservá galpón.',
    'Si el usuario dice depósito, no lo reemplaces automáticamente por galpón.',
    'Si el usuario escribe nave industrial, entendelo y mapealo a vocabulario natural local, normalmente galpón industrial, salvo que el contexto indique otra cosa.',
    'coreQuery: solo conceptos esenciales, corto y preciso.',
    'optionalTerms: máximo 3 matices opcionales. Puede ser []. No rellenes por completar.',
    'No repitas en optionalTerms términos ya presentes en coreQuery.',
    'No agregues ubicación no pedida.',
    'No conviertas conceptos frecuentes en requisitos nuevos.',
    'No tratar como sinónimos exactos: biblioteca/librería, techos altos/doble altura, costero/vista al agua, industrial/estructura metálica.',
    `Conceptos semánticos principales: ${SEMANTIC_DESCRIPTION_CONCEPTS}.`,
    `Tags de apoyo permitidos: ${SUPPORT_TAGS}.`,
    'Features reales activas de alto valor semántico:',
    ...featureVocabulary.map((feature) => `- ${feature}`),
    'Ejemplos obligatorios:',
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
    const featureVocabulary = await getFeatureVocabulary()

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
          input: buildPrompt(query, featureVocabulary),
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
