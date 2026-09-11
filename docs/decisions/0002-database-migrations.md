# ADR 0002: One migration authority with Supabase integration

Status: Accepted (amended 2026-08-23)

## Context

The canonical plan approves PostgreSQL/PostGIS, Drizzle and Supabase Auth, Realtime and Storage. Spatial schema, RLS, grants, functions and triggers must be reproducible across local development, CI, staging and production without two histories racing to own the same database.

## Decision

Use `packages/db/src/schema.ts` for relational definitions and `packages/db/drizzle` as the only ordered, forward-only migration sequence.

- Generate normal relational changes with `pnpm db:generate`.
- Review generated SQL.
- Add custom SQL migrations in the same sequence for PostGIS extensions, RLS policies, grants, triggers and database functions.
- Apply with `pnpm db:migrate` locally and in CI.
- Apply the same immutable sequence as a production release step before application rollout.

The `supabase/` directory may contain local service configuration, edge functions, seed orchestration and policy tests. It must not contain a second independently ordered schema migration history.

## Consequences

Every database state is reviewable and reproducible, while Supabase remains a first-class service boundary. Local PostGIS and hosted Supabase environments consume the same schema history. Applied migrations are immutable.

## Rejected alternatives

Runtime schema synchronization was rejected as unsafe. A second Supabase migration tree was rejected because competing authorities can drift; Supabase-specific SQL is still supported through custom migrations in the canonical sequence.
