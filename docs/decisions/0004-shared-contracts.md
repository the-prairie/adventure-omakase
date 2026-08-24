# ADR 0004: Shared runtime contracts

Status: Accepted (amended 2026-08-23)

## Context

API, web and mobile must agree on wire formats at compile time and runtime. The plan also requires contract-first `/v1` REST APIs, generated clients, revision checks and structured failures.

## Decision

Define strict network schemas in `packages/contracts` with Zod and infer TypeScript types from those schemas. Keep the package free of Fastify, Next.js, Expo, React, database and provider SDK imports.

Place transport behavior, deadlines, cancellation and client lifecycle in `packages/api-client`, not in the contract package. Product API generation may consume the same source schemas when its vertical slice begins.

## Consequences

Producers and consumers validate one wire format while pure contracts remain usable in Node, browser and React Native contexts. Contract changes require coordinated producer and consumer tests.

## Rejected alternatives

Duplicated client interfaces provide no runtime protection. Framework-owned schemas couple the contract to one runtime. Mixing React hooks into the schema package was rejected because it contaminates the lowest-level boundary.
