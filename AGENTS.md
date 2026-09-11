# Repository Agent Guide

Read `ARCHITECTURE.md`, applicable ADRs and nested `AGENTS.md` files.
For friends release work, read `docs/exec-plans/active/cloudflare-friends-integration.md`.
For broader product work, read the applicable sections of
`docs/product/adventure-omakase-v1.md` and
`docs/exec-plans/active/adventure-omakase-v1-build.md`.

## Agent skills

### Issue tracker

Engineering issues live in GitHub Issues for `the-prairie/adventure-omakase`; external pull requests are not a triage surface.
See `docs/agents/issue-tracker.md`.

### Triage labels

The repository uses the standard five-state triage vocabulary.
See `docs/agents/triage-labels.md`.

### Domain docs

The repository uses a single-context domain layout with system decisions under `docs/decisions/`.
See `docs/agents/domain.md`.

The complete product plan is present and authoritative. Never reintroduce a “missing plan” blocker.

For open-ended build requests, select the highest-priority unblocked requirement in the active ledger and work through an integrated vertical slice. For a scoped request, complete that request without selecting unrelated ledger work. Keep status, acceptance, implementation evidence, observed test evidence and commit SHA current. A scaffold, type, table, route or mock does not complete a product requirement.

Preserve these executable boundaries:

- Applications may depend on packages; packages never depend on applications.
- Mobile and Studio never import `@adventure-omakase/db`.
- `packages/contracts` stays framework-neutral.
- Domain code imports no React, Expo, Next.js, Fastify, database or provider SDK.
- Browser code uses same-origin Studio routes; server-only service hosts and credentials never use public environment prefixes.
- `packages/db/drizzle` owns PostgreSQL migrations; `apps/friends/migrations` owns the separate D1 database (ADR 0006).
- Supabase RLS, functions, triggers and extensions are custom migrations in that sequence, not a competing migration tree.
- Realtime notifications never replace canonical committed state.

Add tests before or with behavior. Run narrow checks first, then `pnpm check`; run integration, production-container and end-to-end tests whenever the affected boundary requires them. Infrastructure-backed tests must fail clearly when required infrastructure is missing.

Never claim a check passed without observed output. Keep secrets, personal data and production extracts out of source, fixtures, logs, screenshots and client environment variables. Update architecture, ADRs, commands and the ledger whenever their contracts change.

Continue through all unblocked work in the selected slice rather than stopping after one small edit.
