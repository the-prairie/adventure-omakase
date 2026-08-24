# Testing Strategy

## Layers

Unit tests cover schemas, configuration, transport deadlines/cancellation, components and isolated runtime behavior.

Integration tests prove the real PostgreSQL/PostGIS migration and API readiness path. They intentionally fail with an actionable error when `DATABASE_URL` is absent; infrastructure-backed suites never report success by silently skipping.

Provider contract tests will exercise deterministic success and failure fixtures behind the same interfaces used in production.

Playwright has two topology levels:

1. `pnpm test:e2e` starts Next.js and Fastify development servers and proves the Studio displays a live API response.
2. `pnpm test:e2e:production` creates an isolated PostGIS/API/Studio Docker Compose project, applies the real migrations, waits for container health, and runs the same browser contract against the built images. It uses host ports 55432, 4400 and 3300 and removes its dedicated volume on exit.

Production builds and Expo export prove framework/package boundaries compile. The production-container test proves runtime environment injection and server-to-server routing, not just image creation.

## Commands

```sh
pnpm test:unit

pnpm infra:up
pnpm db:migrate
pnpm test:integration

pnpm build
pnpm mobile:export
pnpm test:e2e
pnpm test:e2e:production
```

Tests use synthetic values only. The production smoke project is isolated from the normal local Compose project so its cleanup does not delete a developer's normal PostGIS volume.

Future product slices add property tests, RLS/concurrency tests, provider fault fixtures, native E2E, simulated location/network loss and physical Osaka field tests as mapped in the active build ledger.
