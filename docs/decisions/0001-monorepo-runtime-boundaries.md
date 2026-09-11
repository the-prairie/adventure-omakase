# ADR 0001: Monorepo runtime and web-surface boundaries

Status: Accepted (amended 2026-08-23)

## Context

The canonical plan requires a native traveler app, Curator Studio, Operations Console, lightweight public web pages and one API/compiler. The bootstrap already contains mobile, Studio and API runtimes. Creating three nearly empty Next.js deployments now would add release and infrastructure cost without improving the first vertical slice.

## Decision

Use pnpm workspaces and Turborepo with:

- `apps/mobile` for the native traveler experience
- `apps/api` for Fastify application services and compiler
- `apps/studio` as one Next.js deployment with separately owned and authorized Curator, Operations and public route groups

Treat those route groups as distinct product surfaces, not one undifferentiated dashboard. Keep contracts, domain rules, database access, design semantics and provider clients in packages with explicit dependency direction.

Split Curator, Operations or public pages into separate deployments when independent security isolation, scaling or release cadence becomes a measured requirement.

## Consequences

V1 retains clear product and authorization boundaries while keeping one web build, one same-origin browser gateway and one deployment surface to harden. A future split remains possible because domain and API contracts do not live in the Next.js application.

## Rejected alternatives

A single full-stack web application was rejected because the core experience must be native. Separate repositories were rejected because atomic contract and state-machine changes would be harder. Three immediate Next.js deployments were rejected as premature operational duplication.
