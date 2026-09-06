# Adventure Omakase V1 Build Ledger

## Purpose

This is the durable plan-to-product map for the canonical blueprint at [`docs/product/adventure-omakase-v1.md`](../../product/adventure-omakase-v1.md).

The ledger is split into four reviewable tables so agents can update evidence without editing one 35,000-character Markdown table:

1. [`01-foundation-scope-and-contract.md`](adventure-omakase-v1-requirements/01-foundation-scope-and-contract.md) — foundation, V1 scope, native/web surfaces, identity, Party Pulse and Fate Contract.
2. [`02-design-content-and-compiler.md`](adventure-omakase-v1-requirements/02-design-content-and-compiler.md) — design system, Magic Graph, compiler and canonical dice foundations.
3. [`03-runtime-data-and-operations.md`](adventure-omakase-v1-requirements/03-runtime-data-and-operations.md) — location, offline runtime, providers, data, APIs, safety and operations.
4. [`04-quality-release-and-roadmap.md`](adventure-omakase-v1-requirements/04-quality-release-and-roadmap.md) — testing, field validation, release channels, first slice, launch gates and roadmap.

Together they contain 95 stable requirement IDs: `FOUND-001`–`FOUND-004` and `AO-001`–`AO-091`.

A product requirement is not complete because a package, route, schema, mock or screen exists. Mark it `Complete` only when implementation and observed validation evidence satisfy its acceptance statement.

## Status vocabulary

- `Not started` — no implementation evidence yet.
- `In progress` — a real portion exists, but the acceptance statement is not satisfied.
- `Blocked` — a non-bypassable external dependency prevents useful repository work.
- `Complete` — implementation and observed validation evidence are recorded.

## Planned vertical slices

| Slice                           | Outcome                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| S0 Repository foundation        | Installable, testable, deployable boundaries and source-of-truth documents |
| S1 Native visual foundation     | Approved warm/light system and native app capabilities                     |
| S2 Identity + Party             | Guest trips, invites, membership, presence and navigator                   |
| S3 Pulse + Contract             | Private Party Pulse, aggregate and immutable consent                       |
| S4 Static Dice vertical slice   | Seeded six-option journey and canonical roll across devices                |
| S5 Magic Graph + Curator        | Versioned content model and authoring/simulation tools                     |
| S6 Providers + Compiler         | Live location, provider adapters, eligibility and option compilation       |
| S7 Runtime + Offline + Repair   | Course execution, packet, check-in, fallbacks and safe exits               |
| S8 Journal + Memory             | Private media, journal and deliberate sharing                              |
| S9 Operations + Flight Recorder | Explainability, alerts, feature flags and operator intervention            |
| S10 Production hardening        | Accessibility, performance, field tests, EAS/Cloud Run and launch gates    |

## Current friends assignment

The September 6 friends edition supersedes the following immediate native slice for this release. Its requirement and evidence ledger is [Cloudflare friends integration](cloudflare-friends-integration.md). Existing AO IDs remain historical and are not relabeled complete by importing the new app.

## Earlier immediate next slice

Begin `S1 Native visual foundation` and `S2 Identity + Party` through one integrated tracer that advances toward `AO-086`.
Start with installable native visual primitives and a guest trip/join boundary that can be exercised on iOS and Android without introducing the later compiler or provider stack.
Keep `S4` as the first complete product milestone.

## Completion audit

Before moving this ledger to `docs/exec-plans/completed/`, audit every requirement against code, migrations, runtime behavior, CI, device evidence and field-test evidence. Repository-fixable partial or missing behavior must be fixed rather than merely documented.
