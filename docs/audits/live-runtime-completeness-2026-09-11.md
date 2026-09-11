# Live web application completeness

Scope: the deployed friends web app and its services. The user explicitly kept
labelled local examples and isolated test fixtures, and asked to report the
separate native app, Studio and API rather than build those future products.

The audit combined runtime source tracing, action and route inspection, a search
for unfinished or simulated behavior, and regression checks. A lack of TODOs is
not proof that every possible interaction is defect-free.

| Surface                                          | Runtime path and result                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared state, sessions and permissions           | `public/app.js` calls the same-origin Worker. `src/worker.ts` reads and writes D1, validates sessions and mutation headers, and returns failures rather than substituting example state. Cached offline views remain visibly unconfirmed.                                                                                                                              |
| Invitations, decisions, capacity and updates     | Plan, RSVP, segment, comment and update actions use canonical transactions and revisions. The shared `plan-context.js` projection does not create a parallel state store.                                                                                                                                                                                              |
| Discovery and curation                           | All 300 built-in entries now have a real, attributed image. There are 200 distinct primary photographs. The original 55 illustrated entries retain their photos; 245 additions use explicitly labelled area or activity references. The browser and assistant catalogue snapshots match. Sources describe historical photographs, not current opening or availability. |
| Cards, controls and place sheets                 | The shared button helper mixed button and text-link classes, removing the padding from outlined controls. The helpers now choose one variant. Friends actions, search/region separation, result spacing and sheet insets were corrected together.                                                                                                                      |
| Editable outings, saving and recommendations     | Local outing drafts publish through the ordinary plan API only after review. Private saves and group recommendations remain separate persisted actions. No timer or local success message substitutes for a server response.                                                                                                                                           |
| Memory photos and exports                        | Shared photos use private R2 and authorized reads. Memory creation, editing, visibility, deletion, export and print consume actual contributions. User-authored discoveries without an image are not assigned fictional venue photography.                                                                                                                             |
| Research, translation, routes and booking import | Real provider adapters remain behind configuration, deadlines and permission checks. Missing credentials and provider failures stay visible. Booking import now combines user cancellation with an HTTP deadline. Research-only operations cannot book, RSVP or publish.                                                                                               |
| Travel context                                   | The tools previously chose the first profile window, or a hard-coded Namba origin. They now use the selected day's unique region/area, and leave unknown or conflicting locations blank.                                                                                                                                                                               |
| Interrupted work and watches                     | A worker interruption could leave a travel task permanently running. Task reads now expire overdue running rows only for the requesting member and trip; completed work, other members and uncertain spend are preserved. Watches remain persisted scheduled work with leases, rather than browser timers simulating a service.                                        |
| Examples, fixtures and libraries                 | `example.html` explicitly selects the local example engine. Real entry points continue through the shared API. AI/provider fixtures are opt-in test infrastructure. Vendored libraries, input placeholder text, loading states and example data are retained; these are not unfinished application paths.                                                              |

No additional runtime stub or simulated-success branch was found in this scope.
The checks do not establish that external venue information is current, that a
reservation exists, or that every possible provider response has been exercised.
Paid providers were not called solely to validate these spacing and local
catalogue changes. Existing deterministic provider tests remain in place.

The separate products remain unfinished: `apps/mobile/src/connectivity-screen.tsx`
is a native connectivity screen; `apps/studio/src/app/page.tsx` is a Studio
connectivity page; `apps/api/src/app.ts` provides health/readiness and foundation
infrastructure rather than the native product's business API. They are not routes
used by the deployed friends web app. Their full product requirements remain in
the authoritative v1 plan and ledger.

Observed checks and deployment evidence are recorded in [current status](CURRENT_STATUS.md).
