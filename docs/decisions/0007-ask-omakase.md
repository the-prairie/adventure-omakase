# ADR 0007: A bounded companion inside the friends fieldbook

Date: 2026-09-06. Status: Accepted implementation direction; live acceptance tracked separately.

## Context

The companion helps the acting member discover, check and propose. It must not build a competing itinerary or infer that friends are available. The September 6 amendment authorizes one integrated companion, including real-provider verification on an isolated trip.

## Decision

Use the existing Worker and an environment-specific Workers AI binding, with `@cf/openai/gpt-oss-120b`. No separate agent server or durable background job is needed: a task runs inside one bounded HTTP request, with inspectable D1 status and explicit cancellation. Ordinary app actions remain usable without the binding.

The model gets the current member's explicit preferences, shared travel windows, selected date/region/area/time and actual committed parts. Older private notes and other members' preferences are excluded. `search_discoveries`, `search_places` and `check_sources` are read-only typed tools. New public leads use Wikimedia search; page reads require public HTTPS addresses, DNS and redirect validation, response-size bounds and timeouts. Page text is untrusted evidence. Sources retain URL, checking date and exact quoted text; published information does not establish availability.

D1 owns task status, budget reservations, cached place research, plans and participation. Task requests are scoped to the authenticated member and trip. Personal recommendations stay in that member's task; reusable source evidence is attached to its place. Four requests/member/hour, four model calls/task, four source reads/task, one external search/task, one validation repair, a 75-second deadline, a 3,000-neuron task reservation and an 8,000-neuron daily trip budget bound use. Provider usage is recorded when returned; incomplete usage is labeled and conservatively reserved. Research cache is 24 hours; task retention is seven days and research retention 90 days.

The app validates IDs, regions, exact quotations, per-part source coverage and the selected time window before displaying cards. Invitation duration is derived from its parts. It displays editable confirmation and calls the same `createPlan` action as the ordinary UI. The server enforces session identity, idempotency and a current snapshot sequence atomically. A changed trip requires refreshed research. The model cannot issue SQL, publish a plan, book, RSVP or change another member's participation.

Trip dates are editable by the owner and guarded against excluding existing plans or memories. Dates are resolved in Asia/Tokyo; the current default is September 26–October 14, 2026.

## Consequences and verification

A small fieldbook can use direct request execution; durable jobs would be needed if later research exceeds this deadline. Snapshot-wide invalidation is conservative and can require refreshing after an unrelated trip edit. Cached/public pages can be unavailable or incomplete. Model output remains a proposal, not proof of opening status, transport feasibility, safety or inventory.

CI injects a clearly labeled deterministic provider into the test-only Worker entry point. It never substitutes that fixture for live-provider evidence. Native D1/R2 tests, browser tests and live deployment evidence are recorded separately in CURRENT_STATUS. Backup format v4 includes tasks, budgets and research; v3 remains readable with those tables empty.
