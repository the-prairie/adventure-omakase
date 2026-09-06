# ADR 0006: Shared Cloudflare friends edition

Status: Accepted for the September 6, 2026 implementation assignment.

The current user request replaces the earlier native-first group runtime as this release's product scope: friends travel independently and may join parts without compulsory attendance.

`apps/friends` owns the single traveler release on Workers + Static Assets, D1 and private R2. Existing native, Studio and Fastify work remains preserved for future use; it is not another production friends homepage. Framework-neutral packages remain framework-neutral.

D1 cannot apply PostgreSQL/PostGIS migrations. Its forward-only sequence is `apps/friends/migrations`; `packages/db/drizzle` continues to exclusively own PostgreSQL. This supersedes the global single-sequence assumption only across these separate databases, never creates two histories for one database, and never implies data has been migrated.

The supplied fieldbook is a legacy local record viewer. Its saved discoveries can be imported privately; journals, calendars and browser storage require separate export and migration work. Existing private content must stay private. No live data is deleted or automatically published.

Deploy preview and production with distinct Worker/D1/R2 bindings and explicit account selection. Production remains behind repository approvals; no automatic merge. Require an HTTPS health check tied to the commit after every deployment, even without local operator files. Code rollback does not reverse SQL migrations.
