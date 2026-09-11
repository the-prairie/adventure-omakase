# ADR 0003: Deterministic local providers and production adapters

Status: Accepted (amended 2026-08-23)

## Context

The plan requires Google Places, Google Routes, weather, curated events and a narrative model, but local development, tests and CI must not depend on paid credentials or unstable live responses.

## Decision

Define typed provider interfaces at application/domain boundaries. For each provider capability:

- implement a deterministic synthetic or recorded local adapter
- implement the production adapter behind the same contract
- validate external payloads at runtime
- categorize timeouts, rate limits, malformed data and unavailability
- record attribution, retrieval and expiry metadata where required
- keep API budgets and kill switches explicit

The bootstrap uses the official PostGIS image locally. Product provider adapters enter only through mapped vertical slices, not ad hoc SDK calls from UI or domain code.

## Consequences

Compiler, recovery and simulator behavior can be tested and replayed without credentials. Production integration remains replaceable and observable. A missing production secret does not block repository-side implementation.

The current PostGIS tag uses `linux/amd64`; Apple Silicon may run it through emulation.

## Rejected alternatives

Hosted-only development would add credentials and network fragility. Live-provider tests would be nondeterministic and costly. UI-level SDK calls would make replacement, replay and privacy review difficult.
