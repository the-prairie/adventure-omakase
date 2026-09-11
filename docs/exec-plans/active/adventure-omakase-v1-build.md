# Adventure Omakase V1 Build Ledger

## Corner-inspired mobile discovery

Status: **Implementation and local regression complete; publication pending.**
The September 11 request selects Corner as the mobile reference. Acceptance:
searchable places, private saved scope, persistent list/map selection, compact
photo-led place sheets, inspectable sources and preserved invitation flows.
Curated outings and dice use one disclosure; no public-follow or visited-rating
backend is introduced. Source: `apps/friends/public/app.js`, `app.css`,
`discovery-map.js`; research: `apps/friends/docs/CORNER_MOBILE_RESEARCH.md`.
New browser coverage: `tests/native/corner-mobile.spec.mjs`. Exact observed
checks, implementation commit and deployment evidence belong in current status.

## Current selected slice — ChatGPT Sites outing planning

The September 9 user direction makes the existing ChatGPT Site the delivery
target. The native requirement history below remains a future blueprint, not a
requirement to rebuild the app before improving this surface.

Status: **Complete for the selected browser slice.** Implementation commit
`37ff27ba53e4d96fc6f57f312ff398a82b496ac5`; Sites version 5 source
`b53c63bb129d7ab085e5a5c354ca23708fa9f0a5`. Published and exact-verified
September 10 at 01:17:24 UTC (September 9 locally): health and all 13 release
assets matched. Real-device and availability checks remain manual.

Acceptance: turn a curated outing into an editable daily schedule, preserve
source and manual-check context, publish through canonical invitations, allow
part-only participation and reconfirmation, and download a clearly stale offline
day sheet. Implementation: `apps/friends/public/outings.js`, the existing plan
form, and `tests/outings.test.mjs` / `tests/native/outing-planner.spec.mjs`.
Local and deployment evidence is recorded in `docs/audits/CURRENT_STATUS.md`.
This slice does not claim completion of the native compiler or offline runtime.

## iPhone refinement

Status: **Complete for the browser refinement.** Implementation
`1caedfc049e83c7edd7654abffd5aa4031cbfced`; Sites version 6
`e453751fcfcc4069c2d9ce70ecb1f046507ac8d1` published and exact-verified
2026-09-10 at 03:24:00 UTC. All 60 browser cases and root checks passed.

Acceptance: readable touch controls, full-width phone forms, reachable review
and publish actions, preserved drafts after viewport changes, visible validation
focus and no horizontal overflow at small widths. Implementation is in
`apps/friends/public/app.css` and `public/app.js`; the new
`tests/native/iphone.spec.mjs` uses touch emulation, including a shortened
viewport. Publication and observed checks are tracked in current status. Actual
iPhone keyboard, sign-in and Home Screen behavior remain device acceptance work.

## Compact phone agenda

Status: **Complete for the browser slice.** Implementation commit
`9dc6b90d4b284ddf12fbfe670bca82317bdf7231`; Sites version 7 source
`adf5831990e5dece2aa5579dc99bf737013cbcbb` published and exact-verified
2026-09-10 at 07:15:06 UTC. The agreed daily agenda is implemented in
`apps/friends/public/app.js` and `app.css`, with focused browser cases in
`tests/native/compact-agenda.spec.mjs`. Observed checks and screenshot evidence are recorded in current status.

Acceptance: four ordinary invitations fit above the phone dock, personal and
group scopes preserve participation semantics, agenda/map retain the chosen day,
meeting and RSVP precede expandable detail, and all four phone navigation routes
work. Existing shared-trip, planning and responsive browser checks remain gates.
Physical-device acceptance remains manual.

## Discovery-first experience repair

Status: **Implemented, verified and published as Sites version 8.** The user rejected the agenda
as the front door and delegated the product direction. The selected slice makes
the discovery fieldbook the landing surface, with an immediate playable local
die, photographed curated stories, source inspection before planning, and the
compact agenda under Your day. All existing research and planning contracts
remain required. Relevant source: `public/app.js`, `app.css`, `dice-atlas.js`;
acceptance: `tests/native/explore-home.spec.mjs` plus the full browser regression.
Implementation: `02a9e7c`; Sites source: `60680b9be0cb1e8297f946a7c9b9dca70235fecf`.
Authenticated health and 13 assets matched at 2026-09-10 08:33:50 UTC.
Detailed observed checks and physical-device limits are in current status.

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
