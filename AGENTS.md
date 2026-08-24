# Repository Agent Guide

Read, in order:

1. `docs/product/adventure-omakase-v1.md`
2. `docs/exec-plans/active/adventure-omakase-v1-build.md`
3. `ARCHITECTURE.md`
4. Applicable ADRs and nested `AGENTS.md` files

The complete product plan is present and authoritative. Never reintroduce a “missing plan” blocker.

Select the highest-priority unblocked requirement in the active ledger and work through an integrated vertical slice. Keep status, acceptance, implementation evidence, observed test evidence and commit SHA current. A scaffold, type, table, route or mock does not complete a product requirement.

Preserve these executable boundaries:

- Applications may depend on packages; packages never depend on applications.
- Mobile and Studio never import `@adventure-omakase/db`.
- `packages/contracts` stays framework-neutral.
- Domain code imports no React, Expo, Next.js, Fastify, database or provider SDK.
- Browser code uses same-origin Studio routes; server-only service hosts and credentials never use public environment prefixes.
- `packages/db/drizzle` is the only ordered schema migration sequence.
- Supabase RLS, functions, triggers and extensions are custom migrations in that sequence, not a competing migration tree.
- Realtime notifications never replace canonical committed state.

Add tests before or with behavior. Run narrow checks first, then `pnpm check`; run integration, production-container and end-to-end tests whenever the affected boundary requires them. Infrastructure-backed tests must fail clearly when required infrastructure is missing.

Never claim a check passed without observed output. Keep secrets, personal data and production extracts out of source, fixtures, logs, screenshots and client environment variables. Update architecture, ADRs, commands and the ledger whenever their contracts change.

Continue through all unblocked work in the selected slice rather than stopping after one small edit.
