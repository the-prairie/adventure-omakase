# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; draft [PR #1](https://github.com/the-prairie/adventure-omakase/pull/1). The original history was preserved and joined with the recreated remote main. No merge or production deployment has been performed.

The shared app and travel companion are implemented on the isolated HTTPS preview. **Full live companion acceptance remains incomplete.** Successful direct Google setup tests and deterministic provider fixtures do not complete the deployed journey.

| Gate                     | Observed state                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared app               | Worker, D1, private R2 and all 300 supplied discoveries integrated. Three independent live browser sessions verified ordinary activity/lunch publication, lunch-only RSVP, independent Tokyo member, shared photo and restored story.                                                                              |
| Validated implementation | Booking-to-profile entry deployed at `ea2954638470b6bd4b220162527110ae5da25f0c`; exact HTTPS Worker and assets verified September 7 at 01:53:40 UTC (Worker `a2c476b7-9a36-48f3-b7b2-934fbeb504ca`).                                                                                                               |
| Repository checks        | `pnpm check`: 12 successful tasks and 100 friends tests. Guarded deployment at `ea29546`: 11 native workerd checks and all 30 Chromium/WebKit cases passed. Browser provider fixtures are separate from live evidence.                                                                                             |
| Live Google successes    | Japanese text translation, synthetic Japanese sign interpretation, walking route, recovered translation draft and explicitly reviewed save to shared story.                                                                                                                                                        |
| Live Google failures     | Places Text Search rejected with daily-quota exhaustion. Audio returned HTTP 503 UNAVAILABLE twice. Invitation generation also returned HTTP 503 UNAVAILABLE, before publication; live AI replan was therefore not reached.                                                                                        |
| Website watches          | Actual public-page baseline, UI scheduling and cancellation passed. Real scheduled check advanced at 21:00:28 UTC with zero failures; test watch cancelled afterward.                                                                                                                                              |
| Backup                   | New schema-v5 cloud backup contains populated helper, budget and watch tables and one verified R2 photo. Local populated-table restore tests pass. Earlier schema-v4 cloud restore verified database/photo hashes and restored UI; the new v5 snapshot has not been restored into another fresh cloud destination. |
| Security CI              | A test-only URL substring match reported by CodeQL was replaced with exact parsed-host matching at `cbade78`. CodeQL analysis and security workflow passed at that commit; checks were not disabled or dismissed.                                                                                                  |
| Physical phones          | Not tested. Browser emulation is separate evidence.                                                                                                                                                                                                                                                                |
| Production               | Not deployed. Protected manual main-branch workflow and explicit release approval remain required.                                                                                                                                                                                                                 |

## Live walkthrough evidence

Local recording: `apps/friends/evidence/live/actual-preview-walkthrough.mp4`. It concatenates actual recorded browser chapters without shortening waits or replacing provider results:

1. `live-route-watch`: Google walking route, explicit public-page watch and cancellation (`c6bc3cd`, 20:43 UTC).
2. `travel-walkthrough-4`: live text and synthetic sign translation, then the actual audio-provider failure (`8e128d4`, 20:48 UTC).
3. `live-reviewed-memory`: reopen the saved real translation, review and explicitly save it to the ordinary story (`fddf2cb`, 21:02 UTC). No additional inference.
4. `live-planning`: actual failed invitation request and honest failure UI (`fddf2cb`, 20:55 UTC).

Each chapter has a `report.json`, screenshots and its original `walkthrough.webm` under `apps/friends/evidence/live/`. Screenshots and a converted video frame were inspected. Test participants, the sign and audio clip are explicitly synthetic; model responses are actual provider outputs. The recording is partial acceptance evidence, not a completed end-to-end demonstration. Earlier failed attempts remain locally available.

## Provider and cost boundaries

The preview uses the Google credentials installed in [the setup task](google-backend-setup-2026-09-06.md): Gemini `gemini-3.8-flash` in `adventure-omakase-friends`, Maps in the explicitly authorized billed personal project `amateur-time`. Gemini is on its existing free tier; no subscription or quota increase was performed. Configured Gemini is selected over the existing Workers AI fallback.

Places Text Search has a configured 20/day quota, exhausted during setup and acceptance testing. A temporary allowance for ten additional calls was requested and has not been authorized. More Google capacity requires an explicit decision; no provider switch is inferred.

The app reserves bounded model/Maps usage against a US$5 D1 ledger. Definite provider rejections release reservations; ambiguous network failures keep their conservative reservation. Two recorded HTTP 503 rejections from the prior accounting implementation were reconciled with a one-time compare-and-set correction. This is estimated app accounting, not an invoice or a guarantee about unrelated project usage. The Google $5 monthly budget is alert-only. Gemini built-in paid tools are disabled; venue research uses one bounded Places request, guarded public-page reads and plain model synthesis. See ADR 0008.

## Watch acceptance

One explicitly created synthetic watch for the public Osaka Aquarium English page was made due by changing only its `next_check` timestamp. Its successful manual baseline was 20:47:09 UTC. An early read still showed that baseline. The later remote read confirmed `last_checked=2026-09-06T21:00:28.598Z`, `next_check=2026-09-06T22:00:28.598Z`, zero failures and active status. No intervening manual checks were made. The test watch was then cancelled through the authenticated app API. This forced-due fixture tests real scheduling, not ordinary one-hour elapsed latency. [Cloudflare documents up to 15 minutes of cron propagation](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

## Backup and recovery

Private local snapshot: `apps/friends/backups/2026-09-06-travel-v5-final`. It contains schema version 5, three members, one plan, one RSVP, two memories, one photo, one Ask task, eight helper tasks, one service-budget row and one watch; events were empty. It includes the reviewed translation memory and the cancelled watch after scheduled acceptance. Session cookies are excluded, photo hashes verified. Keep an off-device copy. A populated watch-event/helper/budget round-trip is separately covered by automated backup-format tests.

The earlier cloud restore used the isolated restore D1/R2 resources, preserved photo hashes and passed browser inspection. It did not contain populated AI tables. Restoration requires a fresh destination and never overwrites the active preview.

## Try the preview

Open [the preview](https://adventure-omakase-friends-preview.thelaurenzary.workers.dev). Owner access is in the private local file `apps/friends/.deploy/preview/OPEN_MY_TRIP.html`; do not commit or publicly share that file. It opens the synthetic acceptance trip. Use Invite friends for another browser/device. Production trips are not seeded with test activity.

For companion acceptance after provider availability recovers, use September 28, 2026, Osaka/Namba, 10:00–14:00. Generate and review an activity/lunch invitation, publish explicitly, join lunch from another member, leave the Tokyo friend unassigned, then use the companion to rework the host invitation and reconfirm from the friend. The existing `apps/friends/scripts/live-acceptance.mjs` uses real HTTPS/model/backend; `--ordinary` excludes AI. No background retry or quota increase is scheduled.

Remaining release gates: successful live Places/research, audio and invitation/replan journey, physical iPhone/Android checks, and explicit merge/production approval.

## Later acceptance findings

At 21:23 UTC the same Gemini setup responded after backoff with a clarification: its proposed performance was on October 8, not the requested September 28. This is successful inference, not invitation acceptance. The recording driver stopped because it expected option cards. Inspection found that research was forcibly finalized after three checked sources; the engine now allows its fourth permitted source to investigate an alternative, without raising source, tool or model-turn limits. A regression covers this sequence.

The first `c05500d` Chromium shared-trip CI test and its single rerun timed out before responsive screenshots; WebKit and the other browser cases passed. Local Chromium and WebKit reproductions passed. At `22ea2b3`, per-action deadlines and cleanup that preserves the original failure were added, and CI retained JSON/error-context evidence. That CI browser run passed. The underlying intermittent timeout cause is not established; no test was disabled.

## Traveler experience refinement — September 6

The returning home, discovery entry points, companion menu and invitation hierarchy were refined after the user’s design review. Selected-part commitments and a direct research-failure fallback have browser coverage. Both independent review findings were corrected. Local checks passed: `pnpm check` with 83 friends tests, 14 existing Chromium/WebKit scenarios and two new fallback scenarios. The refinement and follow-up preview are verified at `553c002`; the requested fresh-agent friend recording is complete (see below); this does not supersede the live-provider limitations above.

### Independent friend session and follow-up

A fresh agent, without source, tests or implementation-review context, joined as Alex through the actual preview invitation at `24c0687`. The untrimmed 7:54 mobile-viewport recording is local at `apps/friends/evidence/friend-experience-2026-09-06/alex-friend-experience.mp4`, with `report.md` and screenshots beside it. This is simulated friend research, not a human usability study or physical-phone acceptance.

Observed through UI: lunch-only RSVP, the correct selected time/meeting in My day, private saving of Karahori rowhouse lanes, and a clearly synthetic shared memory. The sole live AI request returned HTTP 503; no retry or fabricated result. Agent assessment: premium visual direction and intuitive partial participation, but not fully polished. Recording tool selector errors and waiting time are documented separately from app friction.

The session exposed retained dialog scroll, a mobile invitation form below the initial fold, and My day initially opening on a different date. The scroll defect was independently reproduced over HTTPS (new-dialog scrollTop 283, title above viewport) and in a failing native browser test (307). The follow-up resets new dialogs to their title, places the invitation form first on mobile and selects the date of a successful joined RSVP for My day. The scroll regression and the updated joining/My day scenario passed in both Chromium and WebKit; the corrected mobile invitation screenshot was inspected. `pnpm check` passed with 83 friends tests. A targeted independent review found no material follow-up regression. Guarded deployment at `553c002` passed all 83 friends tests, 11 workerd checks and 18 Chromium/WebKit scenarios. HTTPS health matched that exact revision at 22:30:24 UTC, Worker version `66a9581e-69d5-4d17-a638-5109cbc55c10`. The friend’s separately labeled post-fix verification is additional evidence; it does not replace the original experience recording. Original session evidence is retained unchanged.

The separately labeled follow-up recordings confirmed initial mobile invitation controls, September 29 selection after a completed RSVP, and discovery titles opening at the top. They also exposed a late RSVP completion reopening a dialog after navigation. `e7d4141` prevents that reopening and refreshes the current view. Its controlled-delay regression passed in Chromium (15.2s shared-trip scenario) and WebKit (15.3s); requests still reach the real local backend unchanged. One intercepted session blocks service workers as required for reliable Playwright interception; the dedicated service-worker upgrade tests remain enabled. `pnpm check` passed. Final release/CI identity is reported on PR #1 and in the local `traveler-refinement-2026-09-06/final-release.json` evidence. No additional AI request was made during follow-up.

## System-wide interface review and AI reliability — September 6

The latest implementation replaces browser-dependent display typography and selection popups with self-hosted Source Serif Display and a native-backed, keyboard-operable combobox component. The shared interface uses flatter content rows, shorter form hierarchy, mobile disclosure for secondary discovery filters, readable travel-date inputs, themed file selection and deliberate helper action layouts. The original 300 entries and illustration pixels remain intact; provenance and font license are recorded.

Independent visual review cleared all six reported fixes after inspecting the refreshed evidence. The bounded matrix is in `apps/friends/docs/design-review-2026-09-06.md`: 48 surface positions and 16 state positions at desktop/mobile widths in both engines, plus open menu captures and existing canonical journeys. This does not claim every content permutation, physical phones, or live-provider success. Local evidence remains ignored and contains synthetic content.

The Gemini adapter now preserves complete candidate context and echoes tool-call IDs. Explicit HTTP 503 retries are bounded per task and attempt, cancellation-aware, and independently budgeted. Protocol and retry regressions are included in the 89 passing friends tests. Historical 503s cannot be attributed conclusively because their provider payloads were not retained. At 23:44:14 UTC, the one corrected replay returned HTTP 429 from the trip daily AI guard before any model call. The deployment dollar ledger was unchanged at US$2.231113 used and US$0 reserved. This does not prove or disprove the Gemini protocol fix against the live provider.

Actual HTTPS UI verification at `ffd56f9` loaded both self-hosted font faces and exercised open selection menus and Escape in Chromium/WebKit at 390px and 1344px. No page errors were observed. Eight inspected screenshots and `report.json` are local under `apps/friends/evidence/redesign-live/`.

The blocked replay identified a second defect in trip-level daily accounting: four settled definite 503 failures each retained the US$0.20 daily allowance despite being unbilled rejections. Earlier successful calls still have measured costs. The read-only reconciliation is US$0.804905 recorded versus US$0.008890 expected after per-task rounding, a US$0.796015 overstatement. The focused fix distinguishes typed provider rejection from uncertain transport/abort; any historical correction is separate, guarded and recorded. No daily cap or deployment spending ceiling is raised.

The daily-accounting patch passes 93 friends tests, including regressions for first-turn rejection, later rejection after measured usage, unknown transport, and conservative cancellation during retry delay. Independent review found no accounting issues. The `ffd56f9` GitHub deployment job failed two reload assertions while the separate native/browser CI job and local guarded deployment passed. A targeted two-engine run with the deployment environment variables also passed. The cause is not established; reload diagnostics and deployment-job artifacts now preserve evidence without relaxing the assertion or enabling retries.

## Final reliability verification — September 7 UTC

Implementation `c344e33e28af5df5615093a882e248bb088caf4a` passes all 94 friends tests, 11 native workerd checks and 26 Chromium/WebKit cases locally. The guarded local attempt then stopped at Cloudflare D1 authorization (7403), before deployment. A subsequent read-only request using the existing credential succeeded; the cause of that authorization response is not established.

Reload diagnostics identified an exact plain-text Miniflare `Network connection lost` HTTP 500 from the local proxy. A test-only classifier allows one repeated GET of the same local root per test, preserves an attachment/annotation and never retries a mutation, application error or remote request. Six targeted runs passed; the final 26-case local guard used zero recoveries. [Cloudflare issue 15002](https://github.com/cloudflare/workers-sdk/issues/15002) documents a similar local disconnect, without proving the cause of every earlier timeout.

A separate CI failure exposed a real late-save race: closing an invitation form while its save completed could reopen its result. A controlled real-request delay reproduced the failure before the fix. Completion now opens the invitation only while its original form remains connected and open; the shared state and success notice still update. The regression passed in both engines, and its synthetic Discover screenshots were inspected.

At `3d561612ff8a2a14c2829f20b8c8b682093111b8`, the AI/accounting fixes were verified over HTTPS. That CI job deployed the Worker but failed its immediate static-release comparison; a subsequent direct read confirmed both Worker and assets matched that revision. This is recorded as a failed deployment job with later convergence, not a clean CI pass.

At 00:14:09 UTC, an exact compare-and-set corrected only the proven synthetic-trip overstatement: US$0.804905 to US$0.008890, with six task snapshots matched and the deployment ledger unchanged. The limits remain US$1/day per trip and US$5 for the deployment. The private before/after audit is retained.

The single subsequent live replay completed one Gemini turn, then failed with upstream Google HTTP 429 `RESOURCE_EXHAUSTED` at 00:14:34 UTC. It returned zero options and published nothing. Measured usage was 1,631 input tokens and 22 output tokens, US$0.00130575 before micro-dollar rounding. The deployment ledger increased by US$0.001306 to US$2.232419, with zero reserved. The daily ledger is US$0.010196, also with zero reserved. The error does not identify which Google quota was exhausted. This verifies live inference and corrected rejection accounting, not a complete research or invitation journey. No further paid retry or quota increase was performed.

At `c344e33`, repository CI, the separate Cloudflare browser CI, and security CI passed. Deployment CI failed 25/26: WebKit cancelled several local script/style requests during reload and `window.OMAKASE` was unavailable. The narrow Miniflare HTTP-500 recovery correctly did not classify or retry this different failure. Its cause remains unestablished; the failure is not counted as a pass. The final guarded local retry and current exact HTTPS identity are retained in private `.deploy/preview/health.json` and linked on PR #1; no automatic test retry or gate bypass is enabled.

## Booking entry — September 7 UTC

The joining form and profile editor accept booking screenshots, pasted images and PDFs. A private AI draft proposes local arrival/check-in and departure/check-out dates and coarse areas. Missing bounds stay open. An inferred year requires explicit acknowledgment; applying details stages the ordinary editable profile form before Save. Later bookings can add or update a window while preserving other dates, bio and interests. Concurrent profile changes return a conflict without overwriting either saved data or the open form.

Observed repository verification: `pnpm check` passed all 12 tasks, including 100 friends tests. Native workerd passed all 11 checks. Populated migration tests preserve existing helper rows and constraints; version-6 restore tests pass. All 30 full-suite Chromium/WebKit cases passed. The booking journey covers including synthetic image upload during joining, pasted images, a later PDF, duplicate drafts, clearing a date back to unknown, provider quota failure, offline/cancellation and stale profile edits. Mobile and desktop screenshots were inspected. These use deterministic provider fixtures; live booking extraction and physical devices remain separate gates.

A complete pre-migration preview backup was created at 01:42:22 UTC, with its one referenced photo checksum verified. It is retained privately; no off-account copy or fresh cloud restore is claimed.

Booking implementation commit: `ea2954638470b6bd4b220162527110ae5da25f0c`. The guarded preview deployment repeated all 100 friends tests, 11 workerd checks and 30 browser cases, applied migration 0004, then verified matching HTTPS Worker/static release at 01:53:40 UTC. The first broader browser run had two outdated one-input join assertions; both were updated to assert one ordinary name field plus an optional upload, and the full suite and deployment gate subsequently passed.

At 01:54:38 UTC, one synthetic live booking-read action returned HTTP 200. Gemini extracted Osaka arrival October 1, 2026 from a Los Angeles September 30 departure, left return date and area blank, and explicitly identified the missing year as inferred from trip context. The existing profile was unchanged. The provider adapter recorded two attempts within that one action, 1,639 input tokens and 189 output tokens, estimated US$0.001938; no separate manual inference retry or quota change was made. The result and inspected mobile evidence are retained under `apps/friends/evidence/booking-live`. This is one real image-extraction success, not a guarantee of OCR accuracy or live PDF/device coverage. The supplied personal booking was not uploaded.

## September 7: supplied logo

Implementation `2359732a02a65abd6787883b087bd21dfc23ae5d` replaces the entry and
traveler-header asterisk wordmark with the supplied sun-and-waves artwork, framed
responsively without changing the source pixels. Local `pnpm check` passed all
12 tasks and 100 friends tests. The release gate passed 11 workerd checks and all
30 Chromium/WebKit cases. Focused entry/home checks at 1440, 390 and 320 pixels
passed in both engines; screenshots were inspected.

Preview publishing is not complete. Local deployment failed at Cloudflare D1
access with error 7403 before remote changes. Hosted deployment run 34091124421
failed with WebKit `page.reload` connection refused in the shared-trip test
(29 passed); the separate Cloudflare browser workflow 34091124355 passed. The
last observed HTTPS preview still served `f2140d3`, not the logo implementation.
The existing CodeQL reporting failure is separate from the successful Security
workflow. No production change occurred.

## Interactive trip experience — September 7

Implementation `75ee13e` connects the requested UI refinements: compact home spacing; clearer host/guest actions; optional editing details; a personal/group in-app calendar; interactive shared-date opportunities and prefilled invitations; visual catalogue previews; and a six-face animated die with viable shortlists and explicit alternatives. Calendar entries derive from existing plans/RSVPs, with personal selected-part times; no download or external calendar is needed. The existing optional .ics export is explicitly labelled. Shared regions are not inferred proximity or availability.

The focused four-case Chromium/WebKit run passed: actual example-mode joining to calendar, correct coffee-only time, group scope, shared-day form prefilling, preserved hidden edit values, six dice faces, ordinary animation, reduced motion, exhausted shortlist reshuffle and empty-filter recovery. Desktop/mobile screenshots were inspected. Final local regression passed all 34 Chromium/WebKit cases (3.9 minutes), all 11 native workerd checks and all 12 `pnpm check` tasks, including 100 friends tests. Earlier full runs exposed test assumptions about newly disclosed fields, two discovery entry points and sticky Save scrolling; those tests were updated while retaining their behavior assertions. The final full run passed without retries or disabled cases. New illustrations depict invented themes rather than venues; provenance is recorded alongside the atlas. No new live-provider acceptance or physical-device evidence is claimed.

## Discovery walkthrough feedback — September 7

Implementation `75251a1` responds to all nine browser annotations with an integrated discovery-to-invitation flow: visible Saved navigation, early mood entrances, source-linked experience context, inline maps, quick date/time choices and properly padded host management actions. Saved remains private until explicitly recommended. A shortlist entry is not a plan or a booking.

The repeated mood atlas is removed from discovery cards. There are 24 distinct, locally hosted photographs with inspected subjects and visible author/license links, plus nine expanded descriptions paraphrased from the cited official tourism sources read on September 7. Other catalogue entries keep their earlier research text and omit unverified imagery. Historical photo dates are visible; neither imagery nor source reading verifies current access or availability. The public discovery asset README records coverage, sources and licensing.

Google Maps loads inside the card only after the traveler selects “Show map here.” That sends the displayed search to Google; no geolocation, paid Places/Routes request or server credential is used. Meeting searches use host text and region/area, with a clear area-only fallback for vague text such as “meet at location.” Search results are not treated as verified meeting pins. A real Google map loaded and was visually inspected locally; automated CI map behavior uses a labelled external-frame fixture.

The focused run passed four Chromium/WebKit cases. The final full suite passed all 38 cases (5.3 minutes), native workerd passed 11 checks, and `pnpm check` passed all 12 tasks including 101 friends tests. The catalogue parity check first caught an unsynchronized companion copy; both JSON copies were regenerated and the unchanged parity assertion passed. Desktop/mobile screenshots and a real Google map were inspected in two bounded rounds. The final layout scan returned no findings. The user's proposed palette inspiration remains pending; no palette direction has been invented.

Preview release `c014662401cc5854059a57cd607a649f1cc802ff` was verified over HTTPS at September 7 20:32:39 UTC: Worker health, release manifest, app/CSS/catalogue bytes and all 24 photograph assets match. A hosted phone-width Chromium example also exercised Saved navigation, the source guide and a real inline Google map without page errors. This is browser emulation, not a physical-phone test.

Hosted checks remain distinct: deployment run `34159089864` passed 101 friends tests, 11 workerd checks and all 38 browser cases, then uploaded the release successfully but failed its immediate asset-manifest comparison during propagation. The later exact verification above confirmed convergence; the failed job has not been relabelled successful or bypassed. Standalone browser run `34159089846` passed 37 cases but caught a WebKit access-control page error from the existing `/api/travel/watches` background refresh. That separate intermittent result remains unresolved; no test was suppressed, no blanket retry was added and the watch code was not changed in this UI slice. Main CI and Security passed.

## September 7: discovery decisions and automatic maps

Implementation `432e184` addresses the seven follow-up browser comments. Dice supports direct tap/keyboard rolling and area shortcuts, then focuses a result with photograph where available, map, travel scale and next action before the controls. Discover exposes area selection and labels local outings, regional excursions and separate stays; directions open Google Maps for the traveler to choose a starting point. Area matches do not establish proximity and on-site estimates exclude travel.

Discovery summaries are short; full guides, practical notes and source status remain available through disclosure. Invitations lead with date, host, cost, booking and joining, with photograph/source context under About this outing. Critical water, booking and separate-stay warnings remain visible. Automatic lazy Maps embeds replace the extra loading button; privacy copy describes the search sent to Google. No device location or paid server Maps request is added. Nakanoshima has a credited 2014 area photograph, bringing photographic coverage to 25 of 300 entries; nine source guides remain expanded.

Observed local validation: `pnpm check` passed all 12 tasks, including 101 friends tests; native workerd passed 11 checks. The full browser run passed 37 of 38 cases: WebKit once failed to reopen a changed invitation on reload. A targeted reproduction of states and interactive flows passed all eight cases across Chromium and WebKit, including the corrected dice title-visibility assertion and area shortcuts. The intermittent reload failure has no established cause and is not claimed fixed. No tests were disabled and no retry policy changed.

Desktop and phone-width screenshots were inspected in two bounded rounds. A real Google map and credited photo rendered in the dice result; mobile invitation, discovery and area selection were exercised without page errors or horizontal overflow. Final scroll offset is covered by the passing title-visibility assertion. Physical-phone testing and live provider acceptance remain separate. Preview verification is recorded below.

Preview verification at 2026-09-08T01:49:35.856Z: Worker health, release manifest, exact hashed app/CSS/data bytes and the new photo match `7ba0cc66d306027d92d5f55af6ca22a11438d257`. Hosted phone-width Chromium exercised the exposed area chooser, dice reveal, photo and automatically loaded real Google map with no page errors. Main CI, Security and standalone friends CI passed; standalone and deployment browser runs each passed 38/38 and native runtime 11/11. Deployment run 34177394562 uploaded Worker version `bc55ff91-81bc-4974-8a86-e152d4e005b7` at 01:48:16 UTC, then failed its immediate asset comparison at 01:48:17. Subsequent exact HTTPS verification confirmed convergence; the failed job is not relabelled successful. The local one-off WebKit reload failure remains unexplained despite passing targeted and CI runs.

## September 8: geographic discovery and readable context

Implementation `ce10453` adds a public area map linked to discovery filters, visible experience/practical/source/host sections, optional food links and credited galleries. Coverage: 144 source-linked area anchors for 276 of 300 catalogue records, 27 photographed records / 28 images, 12 expanded guides and two checked menu references. The map never establishes venue entrances, walking distance or availability. Details and unlocated labels are in `docs/product/discovery-map.md`.

Observed local verification: `pnpm check` passed all 12 tasks, including 102 friends tests; native Cloudflare runtime passed 11 checks; the final full Chromium/WebKit browser suite passed 40/40. A further 2/2 map/content run waits for both gallery images to decode before capturing mobile evidence. Real public OSM tiles loaded in the local in-app browser. Synthetic screenshots were inspected at desktop and phone widths. Evidence logs and the focused browser report are under ignored `apps/friends/evidence/map-content`; screenshot evidence is under `apps/friends/evidence/browser-artifacts`.

The first full browser run failed a stale map callback after resize/navigation and an area marker being absorbed into a cluster. Both were fixed, and the final full run passed. Initial catalogue-parity and fixed photo-count assertions were updated to the newly sourced data and passed. The vendored Leaflet distribution retains upstream CRLF endings, which Git's default whitespace check reports; repository formatting/lint gates exclude the unchanged vendor files. No test suppression or retry-policy change was added.

The ambitious dice redesign is still awaiting the user's direction choice; this map/content implementation does not complete that request. Preview deployment of this implementation remains pending at this checkpoint. Existing production and live-provider acceptance boundaries remain unchanged.

### Preview result for the geographic/content slice

Preview release `6b126b116be752e68f1c8c49c2ba387f5ab953af` is verified at September 8 02:41:42 UTC. The Worker, manifest and 18 assets match the local release byte-for-byte, including both HTML entry points, all hashed bundles, Leaflet and the three new photos. The hosted in-app browser loaded all 18 visible OSM tiles, zoomed area clusters and selected Karahori to show its three catalogue discoveries. The exact-release report is `apps/friends/evidence/map-content/preview-release.json` (ignored operational evidence).

[Deployment run 34180363228](https://github.com/the-prairie/adventure-omakase/actions/runs/34180363228) passed 102 friends tests, 11 runtime checks and all 40 browser cases, deployed successfully and passed its immediate HTTPS release gate. Main CI and Security also passed. [Standalone friends run 34180363235](https://github.com/the-prairie/adventure-omakase/actions/runs/34180363235) passed 39/40 cases and failed the existing WebKit invitation test's extra `fetch('/api/state')` with `TypeError: Load failed`. Both new map/content cases passed there. Two targeted local WebKit repetitions passed; the fetch failure's cause remains unresolved. The failed CI run remains recorded without suppression or a changed retry policy. No production deployment or merge occurred.
