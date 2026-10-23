# Sitio Locaciones — Public Website

This repository contains the public Sitio Locaciones website. It lets people discover locations for audiovisual productions, photography, advertising, and other creative projects, then save locations and organize image selections into request projects.

## Main features

- Browse public locations by category, department, tags, and features.
- Search locations with structured filters and natural-language query interpretation.
- View location details, image galleries, and approximate map areas.
- Register, sign in, recover a password, and manage a profile.
- Save favorite locations for authenticated users.
- Submit a location with image uploads protected by Cloudflare Turnstile.
- Create request projects, select locations and images, autosave project details, and add production or product logos.
- Generate downloadable PDF proposals and share proposals through WhatsApp.
- Handle route loading and errors, SEO metadata, sitemap generation, and optional Sentry observability.

## Technology

- React 19 and TypeScript
- Vite
- React Router 7
- Tailwind CSS 4
- Supabase for authentication, database access, storage, and Edge Functions
- Google Maps for approximate location maps
- jsPDF for PDF proposal generation
- Sentry for optional runtime error reporting and source-map uploads
- Playwright for browser and end-to-end tests
- Node's test runner for the version-recovery tests
- k6 for load-test scenarios
- Oxlint for linting

## Requirements and installation

- Node.js and npm
- A Supabase project configured for this application
- The external services described in [Integrations and external configuration](#integrations-and-external-configuration) when their related features are enabled

Install dependencies and create a local environment file:

```bash
npm install
cp .env.example .env.local
```

Set the required values in `.env.local`, then start the development server:

```bash
npm run dev
```

The production build type-checks the project, builds the Vite application, and generates `sitemap.xml`:

```bash
npm run build
npm run preview
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check, build the application, and generate the sitemap. |
| `npm run build:sitemap` | Generate the sitemap independently. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run Oxlint. |
| `npm run test:version-recovery` | Run the Node test suite for version recovery. |
| `npm run test:version-recovery:browser` | Run browser tests for version recovery. |
| `npm run test:e2e` | Run the Playwright end-to-end suite. |
| `npm run test:e2e:ui` | Run Playwright in UI mode. |
| `npm run test:e2e:headed` | Run Playwright with a visible browser. |
| `npm run test:load:smoke` | Run the k6 smoke scenario. |
| `npm run test:load:normal` | Run the k6 normal-load scenario. |
| `npm run test:load:prod-capacity-no-ai` | Run the production-capacity scenario without AI analysis. |
| `npm run test:load:prod-moderate` | Run the k6 production moderate-load scenario. |
| `npm run test:load:stress` | Run the k6 stress scenario. |
| `npm run test:load:spike` | Run the k6 spike scenario. |

The Playwright suite starts the development server by default. Set `PLAYWRIGHT_BASE_URL` to test another base URL. The authenticated scenarios require the test account variables listed below. Load tests require k6 and their runtime configuration; see [`load-tests/README.md`](load-tests/README.md).

## Environment variables

The following names are used by the application and its build, Edge Functions, browser tests, and load tests. Use placeholders only; do not commit secrets.

### Browser and build

```dotenv
VITE_SUPABASE_URL=<supabase-project-url>
VITE_PUBLIC_SITE_URL=<public-site-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_SENTRY_DSN=<sentry-dsn>
VITE_TURNSTILE_SITE_KEY=<turnstile-site-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
SENTRY_AUTH_TOKEN=<sentry-auth-token>
SENTRY_ORG=<sentry-organization>
SENTRY_PROJECT=<sentry-project>
VERCEL_DEPLOYMENT_ID=<vercel-deployment-id>
VERCEL_GIT_COMMIT_SHA=<git-commit-sha>
```

`VITE_SENTRY_DSN`, `VITE_TURNSTILE_SITE_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, and the `SENTRY_*` source-map upload variables are optional according to the feature or deployment configuration. `VITE_PUBLIC_SITE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` are also read by sitemap generation.

### Supabase Edge Functions

```dotenv
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
OPENAI_API_KEY=<openai-api-key>
OPENAI_SEARCH_QUERY_ANALYSIS_MODEL=<openai-model-name>
```

These values belong in the Supabase environment and must not be exposed to the browser. `OPENAI_SEARCH_QUERY_ANALYSIS_MODEL` falls back to the function's default model when it is not set.

### Browser and load-test configuration

```dotenv
PLAYWRIGHT_BASE_URL=<playwright-base-url>
PLAYWRIGHT_E2E_EMAIL=<e2e-account-email>
PLAYWRIGHT_E2E_PASSWORD=<e2e-account-password>
BASE_URL=<load-test-base-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
```

The load-test scripts also support `SUPABASE_URL` for the Supabase URL and additional scenario-specific k6 variables documented in [`load-tests/README.md`](load-tests/README.md).

## Integrations and external configuration

- **Supabase:** Configure authentication, database schema and RPC migrations from `supabase/migrations`, storage buckets, and the Edge Functions in `supabase/functions`.
- **Cloudflare Turnstile:** Configure a site key for the browser and `TURNSTILE_SECRET_KEY` for the `create-location-submission` function.
- **Google Maps:** Provide `VITE_GOOGLE_MAPS_API_KEY` to render approximate location maps.
- **OpenAI:** Configure `OPENAI_API_KEY` for natural-language search analysis in the `search-query-analysis` Edge Function. The model can be selected with `OPENAI_SEARCH_QUERY_ANALYSIS_MODEL`.
- **Sentry:** Set `VITE_SENTRY_DSN` for production runtime reporting. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` when production source maps should be uploaded during the build.
- **Vercel:** `vercel.json` configures the SPA rewrite to `index.html`; deployment release metadata can use Vercel's `VERCEL_DEPLOYMENT_ID` or `VERCEL_GIT_COMMIT_SHA` variables.

## Relationship to the complementary repository

This public website is complemented by a separate admin panel repository:

- [panelwach — complementary admin panel](https://github.com/federicochelle/panelwach)

The public app redirects `/admin` routes to the public home page; administrative workflows are maintained separately in that repository.

## Repository structure

```text
src/
  app/              Application composition
  components/       Shared UI, authentication, requests, selection, and submissions
  features/         Home, location, and search feature modules
  hooks/            Reusable application hooks
  layouts/          Public and authenticated layouts
  pages/            Route-level pages
  providers/        Authentication, request-project, and selection state
  routes/           Router and route guards
  services/         Supabase-backed data access
  utils/            SEO, persistence, PDF, upload, and integration helpers
  version-recovery/ Client recovery for stale or failed deployments
supabase/
  functions/        Edge Functions for submissions, uploads, and search analysis
  migrations/       Database schema and RPC migrations
tests/              Node and browser-focused tests
e2e/                Playwright end-to-end tests
load-tests/         k6 scenarios and load-test support files
scripts/            Build-release and sitemap utilities
public/             Static assets, metadata, and crawler configuration
```
