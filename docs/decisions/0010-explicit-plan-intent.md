# ADR 0010: Explicit plan intent and shared observations

Status: accepted for the friends release, September 11, 2026.

## Problem

The independent fictional pilot exposed information the people understood but the
application did not: sitting out, solo time, a spending ceiling and a chosen
catalogue place. Comments carried those intentions without changing participation.
The manual invitation form lost the discovery link. The pilot did not demonstrate
attendance, spending, bookings, route feasibility or reconfirmation.

The next agent should not reconstruct plan state from prose on every turn. Human
and agent readers need the same definitions, stable references and guarded writes.

## Decision

Keep one canonical plan and one reply per member. D1 owns their state. An immutable,
pure projection in `apps/friends/public/plan-context.js` interprets them for the
browser, local example, companion and authenticated day observation. Its classic
script export matches the existing browser architecture; the Worker imports the
same file. It contains no I/O, mutable runtime state, provider calls or access policy.

The system has four linked layers:

1. **Evidence:** a catalogue identity, research source, host-authored details and
   acceptance receipt. A source link remains a research lead.
2. **Intent:** an idea or decided plan, open/meet-afterward/solo participation,
   proposed per-person yen limit and the member's explicit reply.
3. **Decision:** a member-scoped projection of current terms, previously accepted
   terms, changed fields, conservative schedule holds and available actions.
4. **Execution:** the existing same-origin API, revision guards, idempotent create
   requests, capacity checks, D1 transactions and authoritative follow-up reads.

The projection does not authorize a write. The database evaluates participation,
revision, membership, capacity and conflict rules again inside the write.

## Semantics

| Fact                  | Meaning                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| No reply              | Unknown; no claim about interest or availability                                    |
| Declined              | Explicitly sitting out; no time or capacity claim                                   |
| Interested / waitlist | No commitment; waitlists are not promoted automatically                             |
| Joined                | A recorded participation choice, with the accepted revision                         |
| Solo                  | A shared heads-up; no guest replies or joining                                      |
| Meet afterward        | Only named parts may be joined                                                      |
| Idea                  | Tentative host intention; its window is retained for conservative conflict warnings |
| Changed join          | Previous reply retained; current terms require reconfirmation                       |
| Cost limit            | Proposed JPY ceiling per person for this plan; zero is zero planned spend           |
| Completed             | Host-marked plan state; not independent evidence of a visit or purchase             |

A cost limit is neither a price estimate nor a payment or enforced personal daily
budget. The cost note remains separate. Solo time is visible to the trip; private
saves remain the existing private planning surface. A host cannot convert an
invitation with joined, interested or waitlisted friends into solo time silently.
They can retain the invitation, or cancel it and make a separate solo plan.

Migration 0005 preserves all prior replies and adds `declined` plus an acceptance
body. A database trigger captures the current body atomically when a member joins
or reconfirms. Older replies have an explicitly unknown receipt; no past details
are reconstructed. Version-7 backups retain receipts and declines. Versions 3–6
can be restored into the current empty schema with unknown historical receipts.

When a joined part disappears, the app asks the member to choose again. The
companion and database conservatively retain the current whole-plan time window
for conflict checks; that window does not claim the member accepted it.

The companion's rework flow preserves participation, capacity and the per-person
limit because its time-and-place review cannot edit those settings. The ordinary
invitation editor owns those changes.

## Read and resource contract

`GET /api/context?date=YYYY-MM-DD` returns a compact day for the authenticated member,
including stable plan IDs, revisions, linked discovery IDs, reply state, action
availability and routes to full details. `after=<seq>` returns 204 if the trip has
not changed. `GET /api/catalogue` exposes the existing static catalogue and shared
custom finds, filtered by ID, region or query, with bounded pagination. Neither
read invokes an AI model or a live provider.

`GET /api/plans/:id` reads one plan through the same trip authorization. All
mutations continue to use the existing API. Private memories, uploads and helper
results are not included in the compact observation. The existing full state
endpoint preserves its audience filtering. No separate agent command store,
privileged simulation role or automatic writer is introduced.

## Verification and limits

Acceptance covers persistent decline/change-of-mind, solo enforcement, source
preservation, typed zero/positive limits, stale replies, acceptance diffs, prior
migration data, backup restore, companion rework and both browser engines. Results
and exact release identity belong in CURRENT_STATUS.

The operator-mediated pilot remains historical evidence. This change supplies a
better planning interface for a subsequent autonomous run; it does not itself
implement a seven-day world clock, physical location, purchases or persistent
inhabitant memories, or prove that the fictional travellers completed a trip.
