# Repository Bootstrap And Merge-Hardening Execution Plan

## Objective

Create a production-quality technical foundation that accurately ingests the approved blueprint, proves runtime and package boundaries, and can hand the first product vertical slice to another agent without restructuring.

## Outcome

The foundation was merged to `main` in [PR #2](https://github.com/the-prairie/adventure-omakase/pull/2) as commit `f355ed8` on 2026-08-24.
The validated PR head was `ae7eaf2`.

## Acceptance Ledger

| Area                  | Status   | Evidence                                                                                                       |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Source of truth       | Complete | Full blueprint at `docs/product/adventure-omakase-v1.md` and 95 stable requirements in the active build ledger |
| Architecture          | Complete | `ARCHITECTURE.md`, ADRs, Cloud Run, EAS and Supabase ownership boundaries                                      |
| Workspace             | Complete | Frozen pnpm workspace with pinned Node 24.19.0 and pnpm 11.22.0                                                |
| Contracts             | Complete | Framework-neutral schemas with producer and consumer tests                                                     |
| Transport             | Complete | Deadlines, cancellation, typed failures and stale-request suppression in `packages/api-client`                 |
| Database              | Complete | PostGIS migration, capability readiness and real integration tests                                             |
| Integration integrity | Complete | Infrastructure-backed tests fail when required configuration or services are absent                            |
| Studio runtime config | Complete | Same-origin browser route and private server-side `API_BASE_URL`                                               |
| Lint boundaries       | Complete | Executable application, package, server and database import boundaries                                         |
| Mobile                | Complete | Loading, connected, unavailable, retry, malformed and stale states covered                                     |
| Delivery              | Complete | CI, production-container Playwright, CodeQL and Gitleaks passed remotely                                       |
| Documentation         | Complete | README, architecture, ADRs, design and testing docs match the merged foundation                                |

## Observed Remote Validation

- [CI run 32678590801](https://github.com/the-prairie/adventure-omakase/actions/runs/32678590801) passed frozen install, formatting, lint, strict type checks, unit tests, PostGIS migration and integration tests, builds, development Playwright and production-container Playwright.
- [Security run 32678590830](https://github.com/the-prairie/adventure-omakase/actions/runs/32678590830) passed Gitleaks and CodeQL.
- [PR #2](https://github.com/the-prairie/adventure-omakase/pull/2) merged the validated tree to `main` as `f355ed8`.

## Residual Scope

EAS, Cloud Run, Supabase product integration and all product behavior remain tracked in the active Adventure Omakase V1 build ledger.
The pinned PostGIS image runs as `linux/amd64`, so Apple Silicon startup may be slower under emulation.
