# Repository Bootstrap and Merge-Hardening Execution Plan

## Objective

Create a production-quality technical foundation that accurately ingests the approved blueprint, proves runtime/package boundaries and can hand the first product vertical slice to another agent without restructuring.

## Acceptance ledger

| Area                  | Acceptance criterion                                                                                | Status      | Evidence                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| Source of truth       | Full blueprint is canonical under `docs/product` and mapped in the active build ledger              | In progress | Root blueprint found; canonical copy and 95-row requirement map prepared |
| Architecture          | Mobile, Curator, Operations, public web, API, Cloud Run, EAS and Supabase boundaries are reconciled | In progress | Architecture and ADR amendments prepared                                 |
| Workspace             | Installable pnpm/Turborepo workspace with pinned runtimes                                           | Complete    | Existing frozen lockfile and workspace configuration                     |
| Contracts             | Shared runtime schemas are framework-neutral                                                        | Complete    | Contracts package and producer/consumer tests                            |
| Transport             | Shared API client has deadlines, cancellation and stale-request safety                              | In progress | Hardening change and tests pending CI                                    |
| Database              | PostGIS starts, migrates and readiness uses real database capability                                | Complete    | Existing migration and integration path                                  |
| Integration integrity | Infrastructure tests fail when required configuration is absent                                     | In progress | Test changes pending CI                                                  |
| Studio runtime config | Browser uses same-origin route and private runtime API host                                         | In progress | Proxy and production-container smoke pending CI                          |
| Lint boundaries       | Runtime globals and dependency rules are executable                                                 | In progress | Scoped flat config pending CI                                            |
| Mobile                | Loading, connected, unavailable, retry and malformed states are tested                              | Complete    | Existing component tests; transport changes will rerun them              |
| Delivery              | CI, production-image smoke, CodeQL and Gitleaks v3 pass remotely                                    | Pending     | Draft PR and Actions run required                                        |
| Documentation         | README, architecture, ADRs, design and testing docs match implementation                            | In progress | Source and runtime updates prepared                                      |
| Completion            | Bootstrap plan moved to `completed/` only after green remote evidence                               | Pending     | Do not move early                                                        |

## Previously observed local evidence

The original bootstrap agent recorded:

- 23 unit tests across seven workspaces
- lint and strict type checks
- real PostGIS migration and integration tests
- API and Studio production builds
- Expo web export and Expo Doctor
- one Playwright health-flow test
- API and Studio Docker builds

These results remain historical self-reported evidence until the pull-request workflows independently rerun the hardened branch.

## Remaining sequence

1. Commit source-of-truth, ledger, architecture and design corrections.
2. Commit runtime configuration, transport cancellation/deadline and production-container smoke.
3. Commit scoped lint, integration-test and security workflow hardening.
4. Open the draft pull request.
5. Inspect every CI and security result; fix repository-side failures.
6. Record workflow evidence and move this plan to `docs/exec-plans/completed/repository-bootstrap.md`.

## Blockers

There is no missing-plan blocker and repository write access is available.

A GitHub-hosted workflow or repository setting is a blocker only after a real run demonstrates that the repository cannot fix it.
