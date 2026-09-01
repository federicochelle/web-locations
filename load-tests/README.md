# Load Testing con k6

Esta suite simula trafico read-only sobre la web publica y sus endpoints publicos asociados, sin tocar mutaciones ni flujos excluidos.

## Cobertura

- `/`
- `/busqueda`
- paginas de categoria `/categorias/:slug`
- detalle de locacion `/categorias/:categorySlug/:locationCode`
- `categories`
- `get_public_departments_with_locations`
- `get_public_departments_by_category`
- `search_public_locations_v2`
- `search_public_locations_v4`
- `search_public_locations_v4_related`
- `functions/v1/search-query-analysis`
- detalle publico en `locations`

## Exclusiones

- creacion, edicion o borrado de proyectos
- PDFs
- WhatsApp
- emails
- pagos
- Turnstile
- mutaciones
- acciones admin

## Escenarios

- `smoke`: 1 -> 5 -> 10 VUs, 5 minutos
- `normal`: 1 -> 10 -> 25 -> 10 VUs, 7 minutos
- `stress`: 1 -> 10 -> 25 -> 50 -> 100 -> 25 VUs, 12 minutos
- `spike`: 10 -> 100 rapido -> 100 -> 10 VUs, 6.5 minutos

La distribucion de trafico intenta aproximarse a:

- 40% busqueda
- 30% detalle de locacion
- 20% categorias/home
- 10% navegacion read-only adicional

## Variables de entorno

Minimas:

```bash
export BASE_URL=http://127.0.0.1:4173
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
```

Opcionales:

```bash
export TARGET_ENV=localhost
export SEARCH_TERMS="montevideo,casa,playa,campo,hotel"
export SLOW_REQUEST_MS=1000
export APP_REQUEST_TIMEOUT_MS=10000
export API_REQUEST_TIMEOUT_MS=12000
export THINK_TIME_MIN_SECONDS=1
export THINK_TIME_MAX_SECONDS=3
export SAMPLE_CATEGORY_LIMIT=5
export SAMPLE_LOCATION_LIMIT=12
export DEBUG_LOAD_TEST=true
```

Tambien podés reutilizar las variables del frontend:

```bash
export SUPABASE_URL="$VITE_SUPABASE_URL"
export SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
```

## Instalacion de k6

macOS con Homebrew:

```bash
brew install k6
```

Verificacion:

```bash
k6 version
```

## Como correr

Smoke contra localhost:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
BASE_URL=http://127.0.0.1:4173 \
TARGET_ENV=localhost \
SUPABASE_URL="$VITE_SUPABASE_URL" \
SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
npm run test:load:smoke
```

Normal contra staging:

```bash
BASE_URL=https://staging.example.com \
TARGET_ENV=staging \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
npm run test:load:normal
```

Stress contra staging:

```bash
BASE_URL=https://staging.example.com \
TARGET_ENV=staging \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
npm run test:load:stress
```

Spike controlado:

```bash
BASE_URL=https://staging.example.com \
TARGET_ENV=staging \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
npm run test:load:spike
```

## Metricas y thresholds

Se registran:

- total requests
- requests/sec
- p50, p95, p99
- error rate
- HTTP 4xx
- HTTP 5xx
- timeouts
- slow requests
- endpoint mas lento por p95

Thresholds iniciales:

- `error_rate < 1%`
- `http_req_duration p95 < 1000ms`
- `http_5xx == 0`
- `timeout_rate == 0`
- `slow_request_rate < 5%`

## Resultados

Cada corrida genera:

- `load-tests/results/<perfil>-summary.txt`
- `load-tests/results/<perfil>-summary.json`

## Nota sobre detalle de locacion

La ruta de detalle en la SPA hoy esta protegida por autenticacion del cliente. Esta suite igualmente golpea:

- la URL publica del documento HTML de detalle
- la query read-only publica que usa la vista para cargar datos

Eso permite medir la presion sobre la capa publica y el backend read-only sin entrar en flujos autenticados ni mutaciones.
