# Supabase boundary

Supabase is an approved production boundary for Auth, Realtime and Storage.

This directory may hold:

- local Supabase service configuration
- edge functions
- seed orchestration
- RLS/policy test harnesses
- generated local development metadata that is safe to commit

It must not become a second schema migration authority. All PostgreSQL schema, PostGIS, RLS, grants, trigger and function changes belong in the ordered forward-only sequence under `packages/db/drizzle`.

See `docs/decisions/0002-database-migrations.md`.
