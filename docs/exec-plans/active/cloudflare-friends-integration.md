# Cloudflare friends integration

Status: In progress. Baseline: `20adc46`, clean main checkout, origin `https://github.com/the-prairie/adventure-omakase.git`.

September 7 atlas dice amendment: the user selected atlas adventure with tactile drag/fling physics after reviewing two visual concepts. The implementation preserves catalogue eligibility, draws without replacement and empty-shortlist recovery, while adding area camera travel, an overlapping result card, keyboard/reduced-motion alternatives and cancellation. Verification and release identity are recorded in CURRENT_STATUS; physical-device performance remains separate from browser emulation.

The September 6 user assignment supersedes the native-first release scope for this friends edition. The earlier blueprint remains historical context, not a missing-plan blocker.

## Reconciliation decisions

- Ship one traveler app in `apps/friends`: Worker + same-origin Static Assets, D1 metadata, private R2 photos. Preserve Studio/mobile/API foundation without presenting them as alternate friends products.
- Preserve all 300 supplied discoveries, source labels, regional illustrations, neighborhood context and decision dice. New production trips start empty of people other than their owner, plans and memories.
- Preserve PostgreSQL migration history untouched. The D1 schema is a distinct database dialect and deployment, owned by `apps/friends/migrations`; ADR 0006 records this explicit exception.
- Supplied legacy import covers saved discoveries only. No journal, calendar, local browser storage or existing deployment may be overwritten or assumed migrated. Deployment inventory remains required before live changes.
- Keep fictional demo and legacy fieldbook labeled and separate from shared participation. The archive and inherited screenshots are references, not release evidence.
- Keep pnpm 11.22.0 and Node 24.19.0; pin Wrangler 4.129.0 (registry engine >=22). Official Wrangler documentation was consulted September 6.

## Execution and gates

| Requirement                | Status                     | Acceptance / evidence                                                                                                                                                             |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository baseline        | Verified                   | Local history preserved; recreated origin/main fetched; Node 24.19.0 and pnpm 11.22.0 installed and used.                                                                         |
| Shared product integration | Locally verified           | Name-only identity, independent parts, My day, overlap, finds, shared memories, R2 images and print exercised.                                                                    |
| Native runtime             | Passed                     | 11 native workerd D1/R2 checks; no adapters as release proof.                                                                                                                     |
| Native browser             | Passed                     | 10 Chromium/WebKit tests plus 2 hostile-name rendering checks with real navigation/cookies/fetch/storage. Clock and visibility signals are controlled in the lifecycle test only. |
| Repository gates           | Passed                     | pnpm check; DB migration + integration; NODE_ENV=production pnpm build; both development and production-container E2E.                                                            |
| Release tooling            | Locally verified           | Separate bindings, content hashes, stale-client guard, exact HTTPS release gate.                                                                                                  |
| Preview / production       | Preview deployed           | Traveler refinement and follow-up deployed at 553c002; production requires protected main-branch approval.                                                                        |
| Backup / restore           | Passed cloud round-trip    | D1 snapshot and R2 photo restored into isolated resources; hashes and restored UI verified.                                                                                       |
| Ask Omakase                | In progress                | 83 fast tests and fixture browser journeys pass; live Google text/sign/route pass; audio and AI invitation returned HTTP 503. Full live companion acceptance remains incomplete.  |
| Physical phones            | Pending user participation | Actual iPhone/Android acceptance is distinct from browser emulation.                                                                                                              |

Update `docs/audits/CURRENT_STATUS.md` with observed commands, tested commit, deployment identity and remaining gates before handoff.

## September 6 amendment: Ask Omakase

Preserve the integrated shared release and publish the isolated preview as soon as its gates pass. Add one companion within this app: personalized discovery cards, dated reusable research, and editable invitations confirmed through the ordinary backend. D1 remains authoritative; derive identities from sessions, validate revisions and idempotency, and never interpret an empty calendar as availability. Add bounded provider tools, cancellation, limits, caching and measured usage. Validate with fixtures in CI and a separately labeled live-provider Japan-local acceptance. Keep app, AI, CI, restore and physical-device gates distinct in CURRENT_STATUS.

## Google provider configuration checkpoint

September 6: Gemini and Maps credentials installed on the preview Worker; direct provider smoke tests passed. [Configuration evidence](../../audits/google-backend-setup-2026-09-06.md) records billing-project isolation limits, effective quotas, alert-only budget and credential remediation. This does not complete the deployed companion or physical-device gates.

## September 6 amendment: travel companion and actual walkthrough

The user requested end-to-end implementation and a recorded walkthrough using the real app and services, and authorized up to US$5 in live testing. Gemini and Google Maps secrets are installed on the preview Worker. ADR 0008 records provider, cost, privacy and watch boundaries.

| Requirement                 | Implementation and observed evidence                                                                                                | Remaining acceptance                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Provider adapters and spend | Gemini protocol, one-candidate paid reservation, Places/Routes contract tests; unbounded paid tools rejected                        | Text/sign/route passed; Places quota and model 503 block remaining calls          |
| Travel helpers              | Text/media interpretation, recoverable private drafts, transient places/routes, bounded venue research                              | Text/sign/route/reviewed save passed; audio/venue remain blocked                  |
| Host replan                 | Existing contents and stable part identities, canonical revision update, idempotency and reconfirmation tests                       | Live model replan walkthrough                                                     |
| Explicit website watches    | Private persisted jobs/events, deadlines, cancellation, cooldown, leases, failure pause; deterministic handler tests                | Actual public-page baseline, UI cancel and scheduled check passed                 |
| Backup v5                   | Populated helper/budget/watch/event round-trip test; earlier versions remain supported                                              | New v5 cloud backup complete; new cloud v5 restore not run                        |
| Browser UX                  | 14 Chromium/WebKit tests passed, including reviewed memory flow and recent-result recovery; translation/route screenshots inspected | Actual partial walkthrough recorded; failed provider steps visible; phone pending |

Do not mark the walkthrough complete from fixture screenshots or a script that has not run. No merge or production deployment is authorized by this amendment.

## September 6 amendment: traveler experience refinement

The user authorized the design audit recommendations and requested a fresh agent to join as a friend and record the experience. The refinement preserves the existing cream, forest, rust and serif identity.

- Home now shows the next hosted or joined commitment, ordered by the selected part’s Japan-local time, with its meeting point and reconfirmation state. Past and closed plans are excluded from this summary.
- Discover gathers personalized research, the existing discovery draw, catalogue search and friends’ finds. A single travel companion entry exposes all existing helpers.
- Invitation response comes before long prose and sharing tools. Cost, booking and material activity caveats remain visible before consent; joining and booking remain separate.
- Research context can be edited in one disclosure; its summary follows edits. Unavailable research links directly back to usable catalogue discovery without publishing a plan.
- Navigation and text actions have larger touch areas. No new venue photography, curation guarantees or fictional production activity are introduced.

Observed locally: `pnpm check` passed (83 friends tests); 14 Chromium/WebKit scenarios passed, plus 2 new unavailable-research fallback scenarios. Browser assertions cover selected-part home time/meeting and updated collapsed request context. Desktop/mobile home screenshots inspected. Independent standards/specification reviews identified stale request summaries and hidden activity caveats; both corrected. Implementation commits: `4e5a8e3` and `24c0687`. Final guarded preview deployment at `24c0687` repeated all 83 friends tests, 11 workerd checks and 16 Chromium/WebKit scenarios successfully. Mobile invitation response choices inspected after removing duplicate meeting-point prose. Independent friend recording is complete; its outcome and follow-up are recorded in CURRENT_STATUS. Physical-phone and full live-provider gates remain separate.

The independent friend session at `24c0687` completed lunch-only joining, private discovery saving and a synthetic shared memory; its one AI request failed with HTTP 503. It exposed retained dialog scroll (independently reproduced, regression test failed before fix), invitation form placement and My day date selection. Follow-up corrects these three concrete navigation issues. Original recording/report remain local and unchanged; agent simulation and live-service limits are explicit in CURRENT_STATUS.

Follow-up implementation: `553c00210506102c01100c0cca0244102d8b5086`. Guarded preview deployment observed 83 friends tests, 11 native workerd checks and all 18 Chromium/WebKit scenarios passing; exact HTTPS health verified September 6 at 22:30:24 UTC. Agent findings, original recording limitations and remaining live-provider/physical-device gates are recorded in CURRENT_STATUS.

Final navigation follow-up: `e7d4141` prevents a completed RSVP from reopening a dialog the traveler closed while waiting. The actual friend follow-up exposed it; a controlled-delay test forwards the real request and asserts the selected day updates without reopening. The shared-trip scenario passed in Chromium and WebKit. No browser test is disabled; dedicated service-worker acceptance remains intact. Final release and CI identity are attached to PR #1 and CURRENT_STATUS’s release evidence.

### Whole-interface review and reliability follow-up

The current slice adds a shared combobox presentation, self-hosted editorial typography, flat content surfaces and responsive form/action composition. The finite screen/state evidence ledger is `apps/friends/docs/design-review-2026-09-06.md`; independent finish review cleared its six reported fixes. Native tests now include surface captures, open controls, recovery, capacity, waitlists, reconfirmation, cancellation, offline and stale-release states. Gemini tool continuations preserve opaque candidate content and call IDs; bounded 503 retries maintain the existing spending ceiling. Implementation `ffd56f9` passed 89 friends tests, 11 workerd checks and all 26 browser cases; HTTPS UI and exact release were verified. The single live AI replay was blocked by the daily trip guard before Gemini, with the separate dollar ledger unchanged. Evidence remains recorded in CURRENT_STATUS; no production authorization is inferred.

Final reliability implementation: `c344e33` includes the rejected daily-reservation fix (`36e91db`), exact local reload diagnostics/recovery (`3d56161`) and a reproduced late-invitation-save navigation fix. Observed final local gates: 94 friends tests, 11 workerd checks and all 26 browser cases, zero reload recoveries. The historical synthetic daily overcharge was corrected through an exact six-task compare-and-set without raising caps. The one live replay reached Gemini, then failed upstream quota with no options/publication; measured accounting settled correctly. Deployment/asset convergence and exact current release are recorded in CURRENT_STATUS. Full live invitation acceptance remains incomplete.

## September 7 amendment: booking-to-profile entry

The user requested low-friction entry from flights, accommodation confirmations and images while joining or updating a profile, with incremental edits throughout the trip and explicit handling of uncertainty. The provided personal screenshot is context only and is not a test fixture.

Implementation adds authenticated image/PDF extraction, private source review, explicit add/update choices, inferred-year acknowledgment, partial travel windows, stale-edit protection and a preserving helper-table migration with version-6 backup support. Manual entry remains available. Acceptance requires synthetic browser proof of joining with an image, later PDF updates preserving unrelated details, duplicate handling, changing a date back to unknown, cancellation/failure, and separate live-provider evidence. Current observed results are recorded in CURRENT_STATUS; absolute AI/OCR accuracy is not claimed.

Booking slice implementation `ea29546` is deployed on the isolated preview. Observed gates: 100 friends tests, 12 repository tasks, 11 workerd checks and all 30 Chromium/WebKit cases. A complete pre-migration backup preceded migration 0004. One synthetic live screenshot read correctly preserved the destination-local October 1 arrival, unknown return/area and explicit year uncertainty without saving a profile. Current release and provider evidence are in CURRENT_STATUS. Physical-device and live-PDF coverage remain unverified; full companion invitation acceptance remains independently incomplete.

## September 7 amendment: supplied logo

Replace the typographic asterisk logo in entry and traveler headers with the
user-supplied sun-and-waves wordmark. Preserve the original artwork and responsive
home navigation. Local verification: `pnpm check` passed all 12 tasks (100 friends
tests); Chromium and WebKit checked entry and interactive example home at 1440,
390 and 320 pixels. Screenshots inspected; logo loading, horizontal fit and home
navigation passed. Evidence remains under `apps/friends/evidence/logo` and browser
artifacts. Preview identity is recorded in CURRENT_STATUS after deployment.

## September 7 amendment: interactive trip experience

The user's UI walkthrough requested less empty space, clearer invitation actions, fewer exposed form fields, an in-app calendar, actionable shared dates, visual discovery and a tactile dice roll that does not dead-end. This slice keeps the existing identity and canonical state while connecting those surfaces: compact home, decision-first invitation, preserving optional form disclosure, personal/group calendar, shared-day invitation entry, labelled mood illustrations and recoverable animated draws. No live-provider call, new backend event store or production deployment is required by these changes.

Acceptance includes selected-part calendar times without a download, a shared-day prefilled invitation, preservation of hidden editing values, normal/reduced-motion dice, an exhausted shortlist, explicit no-match alternatives and retained ordinary shared-trip journeys. Observed results and the implementation commit are recorded in CURRENT_STATUS.

## September 7 amendment: discovery walkthrough feedback

Address the nine browser annotations as one connected discovery-to-invitation flow. Move mood entrances ahead of results; expose a private Saved destination with a count and direct post-save access; replace the repetitive atlas with verified, attributed photos where available; expand source-derived experience explanations and carry them into invitations; embed an explicitly loaded Google map for discoveries and host meeting text; add quick trip-day, start-time and duration controls; repair the cramped host management buttons.

Acceptance includes private save persistence, distinct local image files with licenses, source provenance, preserved exact dates/times and hidden edit values, no map request before the user loads it, area-only handling of vague meeting text, same-day time bounds and comfortable mobile controls. The palette remains unchanged pending the user's offered inspiration images. Photo coverage and source-reading coverage must be reported explicitly rather than inferred for all 300 discoveries. Observed checks and commit identity are recorded in CURRENT_STATUS.

## September 7: decision-first browser feedback

Implemented in `432e184`: direct dice interaction, area shortcuts and visible discovery area selection; photo/map result before controls; automatic inline maps; travel-scale and directions context; concise discovery and invitation hierarchy. Local checks: 12 repository tasks / 101 friends tests and 11 native runtime checks passed. Full browser run 37/38; targeted reproduction 8/8 across both engines. The one-off WebKit invitation reload failure remains unexplained. See CURRENT_STATUS for evidence and limitations. Preview `7ba0cc6` is exact-verified over HTTPS and its hosted phone-width dice/map flow passes. CI browser runs passed 38/38; the deployment uploaded successfully then failed its immediate asset comparison, with subsequent convergence verified. See CURRENT_STATUS for the recorded job failure. No production deployment or merge is authorized by this refinement.

## September 8: geographic discovery and experience context

The user requested understandable geography, visible explanations, menu links, additional photographs and a more ambitious dice interaction. The geographic/content slice adds a clustered area map driving discovery filters, sourced broad anchors, unlocated-area fallback, flattened experience/host text, two menu references and three licensed photographs. Coverage is 144 area anchors / 276 catalogue entries and 27 photographed entries. See docs/product/discovery-map.md. Dice implementation awaits the user's direction choice; it is not completed by the map work. Verification and commit identity are recorded in CURRENT_STATUS.

## September 8 amendment: curated Map / Fieldbook

The user approved connected Map and Fieldbook views over one curated collection, using Google Maps inside the app and keeping Google navigation as an external action. Implement shared filters/selection, on-demand persistent map loading, source-backed site references where available, honest area/unlocated states, and the restricted public browser-key boundary. Preserve research content, saved ideas, dice and invitations. Keep provider fixture checks separate from real Google preview proof; record observed gates and release identity in CURRENT_STATUS.

Implementation `187bd9c` is live and exact-verified on preview. Actual Google rendering, site selection, shared view context and retained map instance passed desktop/phone-width checks. Deployment passed 103 friends tests, 11 native checks and all 48 browser cases. Separate friends CI passed 47/48 with an unexplained WebKit example-navigation failure; targeted reproduction passed. Detailed release proof and limits are recorded in CURRENT_STATUS.

## September 8: unavailable dice recovery

The reported faded Himeji die is an empty shortlist caused by the default regional-excursion exclusion. Explain the reason on the atlas and offer explicit recovery there, preserving all other filters and existing draw behavior. Local regression and interaction suites passed 8/8 across Chromium/WebKit; pnpm check passed. Release identity and live proof are recorded in CURRENT_STATUS.

Implemented and exact-verified on preview at `a1dfa39`. Hosted Himeji recovery and re-roll passed; deployment passed all 50 browser cases. A separate CI run recorded one external Google iframe error, detailed in CURRENT_STATUS.

## September 8: deeper discovery content

The user requested enough context and relevant imagery to understand each recommendation’s atmosphere and actual experience. This slice expands 24 Osaka/Kansai and Okinawa entries with source-linked descriptions, things to do and practical arrangements, and adds 23 licensed photographs. It preserves all 300 identities and their selection constraints. Coverage is now 36 expanded guides and 50 photographed entries (51 photographs); the rest retain their existing research depth. The public JSON export and companion catalogue match the browser catalogue, including three previously missing public-export enrichments. Tower of the Sun links the operator’s illustrated guide because no suitable reusable photo was established. Exact verification and release identity are recorded in CURRENT_STATUS.

Implementation `0d8c436` is live and exact-verified on preview, including all 67 checked assets. Hosted guide content and imagery were inspected; deployment and friends CI both passed 103 tests, 11 native checks and all 52 browser cases. Detailed evidence and coverage limits are recorded in CURRENT_STATUS.

## September 9: curated outings

The user requested a fresh agent to improve experience selection and curation.
Six Osaka/Okinawa outings now connect twelve existing catalogue entries, with
source-linked sequencing, transport, booking and language guidance. Seven new
expanded guides bring coverage to 43 of 300 retained IDs; image coverage is
unchanged. Fieldbook collections lead to the ordinary guide/save/invite flow
and do not create canonical plans. Date-specific availability and field-tested
journey times remain unverified. Implementation and checks are recorded in
CURRENT_STATUS; the separate Sites evaluation has its own saved release.

The user extended the slice to nearby Okinawan islands and an open-ended onward
journey before Taiwan. Four additional collections cover Tokashiki, Zamami,
Ishigaki/Taketomi and Miyako/Irabu/Shimoji. Eight more expanded guides bring
coverage to 51. Separate stays explicitly require accommodation and transport;
Kagoshima/Yakushima is an onward direction, not an Okinawa catalogue entry.
Flight operation for October and bookings remain unconfirmed.

The user confirmed all three interests: food/bars/wandering, unusual experiences,
and culture/outdoors. Two additional evening collections and three expanded
guides cover Shinsekai play and dinner plus Urizun/Sakaemachi. Tenma includes
optional small-bar wandering. All twelve collections now name their main focus
and what to leave optional. No automatic itinerary or preference record is made.

## September 11 amendment: coherent outings and trip publication

The user requested the complete assessed UI improvement slice, a recorded simulation with four distinct fictional travellers, and a separate owner-private ChatGPT Sites journal. The coherent outing journey is implemented and locally verified: nine regional opening choices, inline recoverable dice, shared story/draft timing, one editor and read-only publication review, prominent day-specific invitations, and voluntary private/shared memories. Existing partial joins and reconfirmation remain canonical.

Acceptance evidence: root `pnpm check` passed 12 tasks and 115 friends tests; Sites compatibility 2/2, local workerd 11/11; the affected browser rerun passed 12/12 after the full regression exposed and corrected travel-tool access and outdated collapsed-calendar selectors. The 13-scene isolated trip passed and was recorded. The final design disposition is ship. Source identities, deployed acceptance and the separate publication are recorded in CURRENT_STATUS; physical-device and live-provider gates remain separate.

Implementation checkpoint `07543d5` is deployed as Sites version 9, source `07dc3a18ea46c6154664a74f6cec4458c62bca7c`; authenticated health and 13 release assets matched. The current two-person audience is unchanged.

## September 11: interface quality repair

Status: implemented, verified and published as Sites version 11. The user's rejected
phone screenshot supersedes prior visual acceptance. Acceptance requires a
complete first discovery name above the 393×620 dock, unclipped 320px search,
consistent primary destinations, preserved keyboard/input context, explicit
memory audience before writing, distinct map controls and usable empty/error
states. Implementation is in `apps/friends/public/app.js`, `app.css` and
`discovery-map.js`; five new browser cases in `quality.spec.mjs` supplement the
existing multi-user, map, curation and trip regression.

Observed repository checks passed 12 tasks / 115 friends tests; both Sites tests
passed. Independent visual review scored three findings resolved and 21 sampled
Axe states reported zero violations. The quality audit and CURRENT_STATUS
record the full regression history and remaining physical/provider limits.
Implementation: `3883c09`. Sites source: `0b8de968095210d3c1557e2083a5161de431c10c`.
Authenticated health and 13 assets matched at 2026-09-11 07:41:07 UTC; the live
phone example also passed first-place and memory-audience assertions.
The existing two-person audience remains at policy revision 2.

## September 11: immersive dice discovery

The user delegated the most ambitious useful replacement for the underwhelming
inline die. The implementation opens a full-screen throw among licensed catalogue
photographs, responds to drag velocity with bounded local physics, opens the
selected photograph and reveals a real eligible place. Region, area, time, mood,
advance-arrangement, transfer, water and event-date limits retain their original
meaning. Rolls avoid repeats until the shortlist is exhausted. Save remains
private; an invitation still requires its ordinary review and publication.

The result offers closer inspection, another throw and previous-roll recovery.
Travel qualifications appear before save/invite; neighbourhood references are
labelled during expansion and on the result. Keyboard and reduced-motion paths,
missing images, presentation failure, empty shortlists and cancellation have
explicit recovery. Sound is opt-in and its context is disposed on close.
Three new source-credited venue photographs bring the catalogue to 55 illustrated
entries; companion and public catalogue snapshots remain equal. Acceptance and
release evidence are recorded in CURRENT_STATUS. Physical-device feel remains
separate from browser evidence. The existing shared Sites audience is preserved.

## Fictional pilot evidence — September 11, 2026

Added the opt-in `tests/native/pilot-completed.spec.mjs` operator-mediated scenario and replay instructions in `tests/native/PILOT.md`. Four independent fictional actors supplied decisions to isolated browser accounts. A fresh retained-harness replay passed (1 Chromium case, 47 seconds); root `pnpm check` passed. The scenario demonstrated separate afternoon ideas and explicit dinner RSVPs, with comments carrying sitting-out intent. This is scenario evidence, not real customer research or reconfirmation coverage. Application baseline was `0073c2134a5b8c227722ca3de770cbbaaff5df9c`; no app runtime change or deployment is implied. Journal publication is separate.

## September 11: explicit intention and coherent agent control

Status: implementation and local acceptance complete; publication pending. The user requested a thorough reading of the pilot feedback
and the changes needed to make the system accurately observable and controllable
with less repeated interpretation. ADR 0010 defines one shared plan projection
across human UI, local example, companion and authenticated agent observation.

Acceptance requires persisted declines distinct from silence, enforced solo
heads-ups, an explicit per-person yen ceiling, preserved manual discovery links,
previous-versus-current acceptance details and a compact day/catalogue read path
that uses the existing guarded mutations. Companion rework must preserve settings
its review does not expose. Older replies retain unknown historical receipts;
version-seven backups preserve new decisions. No new trip simulation is implied.

Observed checks: root `pnpm check` (12 tasks, 120 friends tests), populated
migration/backup round trip, both Sites adapter tests and the two-person phone
flow in Chromium and WebKit. All 11 native workerd checks passed. All 90 enabled browser scenarios have passing
evidence across the full regression and six corrected-copy reruns; two opt-in
historical pilot cases remain skipped. Exact release evidence belongs in CURRENT_STATUS.
