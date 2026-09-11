# Architecture

## Current delivery surface

On September 9 the user selected ChatGPT Sites as the primary browser product.
The existing Site retains the friends Worker, D1 and R2 contracts. Its separate
source checkout owns Sites packaging; this repository retains shared application
source in `apps/friends`. The earlier Cloudflare release remains independent.

`public/outings.js` compiles curated collections into private session drafts and
then ordinary editable invitations. It introduces no schema or alternate plan
store: canonical plan segments own the schedule and RSVP/revision rules still
apply. Travel allocations are estimates, source links remain inspectable, and
exact meetings and availability require review. Downloaded HTML day sheets are
explicitly dated snapshots, contain no participant list or tokens, and never
queue offline mutations.

The phone layout uses full-screen task dialogs and the browser visual viewport
for keyboard-aware sizing at normal zoom. Sticky actions stay in their original
forms, preserving validation and submission semantics. Safe-area spacing and
touch targets are CSS concerns; phone drafts use the same canonical publication
path. Touch emulation does not establish physical-device or installed-web-app
acceptance.

At widths up to 850px, Today renders a compact daily agenda from canonical
invitations. My day includes hosted and joined plans and uses the chosen part's
time and meeting; Everyone's plans uses invitation times and retains personal
participation labels. Interested and waitlisted replies do not become personal
commitments. Removed parts and changed revisions remain explicit review states.
Agenda/map switches retain the selected day; maps use the host's supplied meeting
search, with no inferred route or location. Phone invitation details put meeting
and participation first, with maps, descriptions and source context expandable.
The four phone navigation items are Explore, Your day, Friends and Memories.

New visits and successful joining open searchable discovery. A compact list/map
switch retains region, area, query and selected place. Saved filtering reads
canonical private picks; it never implies a recommendation or attendance. Dice
and curated outings are accessible through “Let Omakase choose.” Its named-area
draw and editorial plans preserve the existing feasibility and source limits.

Place sheets use the existing dialog and invitation actions. Photos, private
save state and summary lead; guide, practical details and research expand
separately. Water, event-window and separate-stay warnings remain visible. The
map is opened explicitly, and failed tiles reveal status and list recovery in
the map viewport. Inter display fonts are self-hosted with their license. The
mobile white/near-black palette changes presentation, not state or access.

## Current friends release

The September 6 assignment and [ADR 0006](docs/decisions/0006-cloudflare-friends-edition.md) supersede the native-first deployment scope for this release. One browser app in `apps/friends` calls its same-origin Worker; D1 is canonical metadata and private R2 holds selected, resized photos. SQL triggers and D1 batches enforce revisions and capacity. Polling only refreshes committed state; it is never a second state authority.

`apps/friends/migrations` exclusively owns the separate D1 schema. PostgreSQL history below is preserved without modification or implied migration. No production data is loaded by a build. The legacy importer only imports saved catalogue IDs privately; original journals and calendars remain outside its coverage.

Local bindings are simulated by actual workerd; named preview, production and restore environments each bind different Workers, D1 databases and R2 buckets. Release assets have content hashes. The Worker identifies its Git SHA and Cloudflare version, rejects mutations from stale clients, and health verification requires the exact deployed SHA. The service worker never caches API data or mixed shells; it removes legacy caches on activation. Local offline snapshots are visibly unconfirmed.

A manual protected deployment workflow promotes committed code; production requires main plus environment approval. Worker rollback does not undo D1 migrations. See [operations](apps/friends/docs/OPERATIONS.md) and [current status](docs/audits/CURRENT_STATUS.md) for observed gates.

Ask Omakase uses the same Worker with bounded read-only research and an environment-specific Workers AI binding. D1 records task status and reusable source evidence; no conversation state can mutate participation. Exact source quotations and typed drafts are validated before an editable confirmation calls the ordinary plan action. See [ADR 0007](docs/decisions/0007-ask-omakase.md) for limits, privacy, cancellation and cache contracts.

The in-app friends calendar and interactive shared-date views derive from canonical invitation, RSVP and profile state; they introduce no second event store or external calendar dependency. Personal agenda times use the chosen participation segment. Discovery dice are a local catalogue suggestion, not a canonical group Fate Contract or a booking. Their animated cube does not change the selection constraints.

Discovery detail uses static, source-linked context and licensed local photographs. Opening a discovery or invitation includes a lazy Google Maps search iframe from its discovery or meeting query; it does not call the paid server Maps adapter or expose its key. Only the search is sent to Google, with no automatic geolocation. Dice use a disposable Leaflet atlas and local physical animation; the existing catalogue draw still owns eligibility and randomness. Its area marker is not a venue entrance. Derived date/time presets still submit ordinary canonical plans.

## Preserved native architecture

The sections below describe the earlier native foundation; their deployment targets are not used for the friends release.

## Product context

Adventure Omakase has five connected systems: Party Pulse, the Fate Contract, the Adventure Compiler, Decision Dice and the Adventure Runtime. The first complete product milestone is a four-person Osaka journey from private preferences through one canonical roll, real-world completion, recovery and a private memory.

The full approved direction is in `docs/product/adventure-omakase-v1.md`. The active requirement map is `docs/exec-plans/active/adventure-omakase-v1-build.md`.

## Deployment units and product surfaces

The repository begins with three deployable runtimes:

- `apps/mobile` — Expo/React Native traveler experience.
- `apps/studio` — one Next.js deployment containing three deliberately separated route groups:
  - authenticated Curator Studio
  - authenticated Operations Console
  - lightweight public invite, completed-adventure and legal pages
- `apps/api` — Fastify API, application services, scheduled-job entrypoints and the Adventure Compiler.

Curator, Operations and public pages are separate product surfaces even though V1 shares one Next.js deployment unit. Server-side authorization and route ownership must prevent public or curator users from reaching Operations capabilities. Split them into separate deployments only when security isolation, release cadence or scaling evidence justifies the operational cost.

The API/compiler container targets Cloud Run. Mobile delivery targets EAS Build, internal distribution, Submit and runtime-compatible Update channels.

## Package boundaries

- `packages/api-client` owns cross-platform transport behavior, deadlines, cancellation and React connection lifecycle.
- `packages/contracts` owns strict Zod wire schemas and inferred types.
- `packages/db` owns PostgreSQL connectivity and the single ordered Drizzle migration sequence.
- `packages/design-tokens` owns platform-neutral visual semantics.
- Future `packages/domain` owns framework-free party, fate, compiler, runtime, content and journal rules.
- Future provider packages implement interfaces owned by application/domain boundaries.

Dependency direction:

```text
UI → Application services → Domain
                         ↘ Provider interfaces

Infrastructure implements provider interfaces.
```

Applications may depend on packages. Packages never depend on applications. Mobile and Studio never import database code. Domain imports no React, Expo, Next.js, Fastify, Drizzle, PostgreSQL or provider SDK.

ESLint enforces the currently expressible boundaries; package exports and tests reinforce them.

## HTTP and browser request paths

Operational API routes `/health` and `/ready` remain unversioned. Product APIs begin under `/v1`, use shared Zod contracts and require idempotency, request IDs, expected revisions and structured error codes for mutations.

Browser traffic uses a same-origin boundary:

```text
Browser → Studio `/api/*` route → private `API_BASE_URL` → Fastify API
```

This keeps internal service addresses out of browser bundles, avoids environment-specific public builds and provides a future session/authorization forwarding point.

Mobile calls the API through the typed client using an environment-specific public base URL appropriate to simulator, emulator, physical device or deployed environment.

## Canonical state and realtime

PostgreSQL is the source of truth. For critical state:

1. Client calls the API.
2. API validates and commits transactionally.
3. API emits a realtime notification.
4. Clients refetch or apply the committed revision.
5. Reconnecting clients fetch the latest snapshot.

Clients ignore stale revisions. Realtime messages never become an alternative database.

## Database and Supabase ownership

`packages/db/src/schema.ts` and forward-only migrations under `packages/db/drizzle` are the only schema authority for local, CI, staging and production.

Supabase is an approved runtime boundary for Auth, Realtime and Storage. Supabase-specific SQL—RLS policies, grants, functions, triggers and extensions—lives as reviewed custom SQL in the same Drizzle migration sequence. The `supabase/` directory may contain local service configuration, edge functions, seed orchestration and policy tests, but it must not contain a second independently ordered schema history.

Production applies the same immutable migrations as a distinct release step before application rollout.

## Provider boundary

Google Places, Google Routes, weather, curated events and narrative models sit behind typed interfaces and runtime-validated schemas. Each production adapter has deterministic synthetic/recorded fixtures, explicit deadlines, attribution handling, provider budgets and categorized failure behavior.

AI may render narrative from verified structured facts. It never decides opening status, route feasibility, accessibility, safety, randomness or sponsored weighting, and every call has a deterministic template fallback.

## Configuration and secrets

Each runtime validates its own environment. `.env.example` is the public contract and contains safe local values only.

- `API_BASE_URL` is server-only Studio configuration.
- `EXPO_PUBLIC_API_BASE_URL` is deliberately public mobile configuration.
- Database, Supabase service-role and provider credentials stay server-only.
- No production secret is baked into images or public-prefixed variables.

## Local topology

Docker Compose exposes PostGIS on host port 54320 with a named volume. The API uses port 4000; Studio uses port 3000; Expo owns its development ports.

The official PostGIS tag is pinned to `linux/amd64`; Apple Silicon developers may see slower startup under emulation.

## Verification layers

- Unit tests: schemas, configuration, transport, components and domain rules.
- Property tests: hard product invariants.
- Integration tests: real PostGIS, migrations, RLS, transactions and API readiness.
- Provider contract tests: deterministic success and failure fixtures.
- Playwright: Studio/API development and production-container topology.
- Native tests: React Native Testing Library, Maestro, simulated location, restart and network loss.
- Field tests: physical Osaka routes, backups, timing, station access and weak connectivity.

Infrastructure-backed suites fail when their required infrastructure is absent; they never silently skip.

## Current versus deferred decisions

The bootstrap implements only technical health/readiness behavior. Product tables, Auth, Realtime, provider adapters and feature surfaces are tracked as `Not started` or `In progress` in the active ledger.

Approved future boundaries are not “unknown”: Cloud Run, EAS, Supabase, the three web surfaces, Osaka pilot zones, walking-only V1, server-authoritative dice and offline Adventure Packets are part of the canonical plan. Detailed vendor credentials and irreversible production actions remain deferred until their vertical slice.

## Change rules

- Contract changes update producer and consumer tests together.
- Schema changes add a forward-only migration and clean-database verification.
- Browser-to-service configuration remains runtime and server-side.
- Product behavior requires a mapped requirement and acceptance statement.
- Consequential deviations from the blueprint require an ADR that records the trade-off.

## Shared travel companion

ADR 0008 adds Gemini, Places and Routes behind authenticated same-origin friends routes, private expiring helper results, and explicitly scheduled website watches. Canonical plan and memory writes remain ordinary domain actions. Durable cost reservations precede provider calls; no client receives provider credentials. See [the travel-tool decision](docs/decisions/0008-travel-companion-tools.md) for spend, retention, restoration and live-acceptance boundaries.

Booking-to-profile entry uses the same private travel-task boundary. Files are transient inline provider inputs; reviewed coarse dates are saved through conditional ordinary profile updates. Unknown date bounds never imply an overlap. D1 migration 0004 and version-6 backups extend helper kinds without changing PostgreSQL. See [ADR 0009](docs/decisions/0009-booking-profile-import.md).

The friends discovery index uses a self-hosted Leaflet distribution, static attributed area references and public OpenStreetMap base tiles. It is browser-only public geography; private state, geolocation and route calculation are outside this boundary. Area selection filters the existing catalogue. See [discovery geography](docs/product/discovery-map.md) for provenance, coverage, provider policy and fallback behavior.

### Discovery view and browser Maps boundary

Map and Fieldbook share the local curated catalogue, filters and selected discovery. Google Maps JavaScript is a lazy, persistent browser presentation; view switches do not recreate it. Site coordinates retain provenance separately from broader area anchors. A public configuration endpoint exposes only the dedicated website/API-restricted browser key; existing provider secrets remain server-only. Origin-only referrers support Google's restriction. The existing Leaflet area presentation remains the unavailable-provider fallback and dice renderer. See [discovery geography](docs/product/discovery-map.md).

### Curated discovery outings

The Fieldbook also presents static, source-linked collections of existing
catalogue IDs. Ordered stops, audience fit and transport context are editorial
suggestions; they do not create canonical plans, bookings or verified routes.
Region filtering applies to collections, while search, Saved, area/mood/time
filters and Map retain their existing discovery scope. Opening a stop uses the
ordinary guide, private-save and invitation flow. Browser and companion catalogue
exports remain identical; collection metadata is browser editorial content.

Collections distinguish local outings, full-day excursions and separate stays.
Island-transfer flags remain unchanged and never silently widen the local dice.
An onward Southern Kyushu editorial note sits outside the catalogue and has no
canonical save action; it does not imply that Kyushu is part of Okinawa.

Each curated collection has an editorial main focus and optional breathing room.
These fields guide pacing; they do not generate scheduled or booked plans.
