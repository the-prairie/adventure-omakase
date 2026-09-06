# Adventure Omakase

The current release is a shared Japan fieldbook for friends traveling independently: **“I’m doing this. You’re welcome to join.”** Open the group link, choose a name, and join an outing or just its coffee reunion. Scheduling uses Japan time, September 26–October 14, 2026.

`apps/friends` is the single traveler release: **Cloudflare Workers + Static Assets, D1 and private R2**. It includes the 300-source discovery catalogue, independent travel windows, invitations, My day, private saves, shared recommendations and a printable photo book. Production trips do not include fictional people or memories. `/example.html` is explicitly a local fictional example.

```sh
pnpm install --frozen-lockfile
pnpm --filter @adventure-omakase/friends db:local
pnpm dev:friends
pnpm test:friends
pnpm test:cloudflare
pnpm test:friends:browser
```

Use Node 24.19.0 and pnpm 11.22.0. Install Chromium and WebKit with `pnpm exec playwright install chromium webkit` before the native browser suite. Local owner setup requires a private `.dev.vars` copied from `apps/friends/.dev.vars.example`; see [operations](apps/friends/docs/OPERATIONS.md).

Release truth: [current status](docs/audits/CURRENT_STATUS.md), [integration plan](docs/exec-plans/active/cloudflare-friends-integration.md), [Cloudflare decision](docs/decisions/0006-cloudflare-friends-edition.md). An older local fieldbook's importer covers only saved discoveries; its private journals and calendars must be exported and preserved separately.

## Preserved native foundation

The following documents describe the earlier native-first foundation, which remains available for future development. It is not a second friends production app.

Adventure Omakase is a warm, editorial native travel experience that lets a group hand the next hour to a carefully bounded game master. The repository is a pnpm/Turborepo monorepo containing an Expo mobile client, a Next.js web runtime for Curator Studio, Operations and lightweight public pages, a Fastify API/compiler, and a PostgreSQL/PostGIS data layer.

The current branch establishes and hardens the technical foundation. Product behavior remains tracked requirement-by-requirement in the [active build ledger](docs/exec-plans/active/adventure-omakase-v1-build.md); scaffolding never counts as a completed product feature.

## Sources of truth

1. [Canonical V1 blueprint](docs/product/adventure-omakase-v1.md)
2. [Active requirement ledger](docs/exec-plans/active/adventure-omakase-v1-build.md)
3. [Architecture](ARCHITECTURE.md) and [ADRs](docs/decisions)
4. Applicable `AGENTS.md` files
5. Automated tests and intentional existing behavior

## Repository

```text
apps/api       Fastify HTTP service and future Adventure Compiler
apps/mobile    Expo Router traveler application
apps/studio    Next.js deployment for Curator, Operations and public web surfaces

packages/api-client     Cross-platform API transport and React connection lifecycle
packages/contracts      Framework-neutral runtime schemas
packages/db             Drizzle client and the single forward-only migration authority
packages/design-tokens  Cross-platform semantic values

docs/product            Canonical approved plan
docs/exec-plans         Requirement, progress and evidence ledgers
docs/decisions          Architecture decision records
docs/quality            Test and quality strategy
supabase                 Supabase integration boundary; not a second schema authority
infra                    Cloud Run, monitoring and environment delivery boundary
```

## Requirements

- Node.js 24.19.x
- pnpm 11.22.0 through Corepack
- Docker with Compose

The local PostGIS image currently runs as `linux/amd64`. On Apple Silicon, Docker may use emulation and database startup can be slower than on native x86_64.

## Start locally

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm doctor
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Default local services:

- Studio: `http://localhost:3000`
- API: `http://localhost:4000`
- API documentation in development: `http://localhost:4000/docs`
- PostgreSQL/PostGIS: `localhost:54320`

Use `pnpm dev:api`, `pnpm dev:studio`, or `pnpm dev:mobile` to run one application. Run `pnpm infra:down` when the local database is no longer needed.

The browser-facing Studio calls its own `/api/*` route handlers. Those server routes use the private runtime `API_BASE_URL`; no internal API host is embedded in the browser bundle.

Expo opens its interactive development server through `pnpm dev:mobile`.

- Expo web and the iOS simulator can normally use `http://localhost:4000`.
- Android Emulator normally uses `http://10.0.2.2:4000`.
- A physical device needs the development machine's reachable LAN address and `API_HOST=0.0.0.0`.

Never commit a developer LAN address.

## Validate

```sh
pnpm check

pnpm infra:up
pnpm db:migrate
pnpm test:integration

pnpm build
pnpm test:e2e
pnpm test:e2e:production
```

`pnpm test:integration` intentionally fails when `DATABASE_URL` is absent. It must never report success by silently skipping infrastructure-backed tests.

Additional commands:

```sh
pnpm format
pnpm lint
pnpm mobile:doctor
pnpm mobile:export
pnpm doctor
```

GitHub Actions validates a clean checkout, applies migrations to PostGIS, runs integration and browser tests, builds the API and Studio containers, starts those production images together, verifies runtime API configuration, and runs CodeQL and Gitleaks independently.

## Deployment boundaries

- The API/compiler container is designed for Cloud Run.
- The Studio container is runtime-configurable through `API_BASE_URL`.
- Mobile delivery will use EAS Build, internal distribution, Submit and runtime-compatible Update channels.
- `packages/db/drizzle` remains the only schema migration sequence. Supabase-specific RLS, functions, triggers and extensions are reviewed custom SQL migrations in that sequence.
- Preview, staging and production promotion, secrets and provider credentials are deliberately not fabricated by the bootstrap.

## Troubleshooting

- Run `pnpm doctor` when a prerequisite or local port is unclear.
- Confirm Docker is running and `docker compose ps` reports PostGIS healthy before migrations.
- If a persisted database rejects local credentials, compare them with the values used when the named volume was first created.
- Use `pnpm infra:logs` for database startup failures.
- If a physical device cannot reach the API, verify the LAN URL and that port 4000 is reachable.
- If Studio reports the API as unavailable, verify its server-side `API_BASE_URL`; do not introduce a `NEXT_PUBLIC_` API host.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md), [the testing strategy](docs/quality/testing.md), and the active ledger before changing shared boundaries.
