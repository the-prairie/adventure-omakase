# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; draft [PR #1](https://github.com/the-prairie/adventure-omakase/pull/1). The original history was preserved and joined with the recreated remote main. No merge or production deployment has been performed.

The shared app and travel companion are implemented on the isolated HTTPS preview. **Full live companion acceptance remains incomplete.** Successful direct Google setup tests and deterministic provider fixtures do not complete the deployed journey.

| Gate                     | Observed state                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared app               | Worker, D1, private R2 and all 300 supplied discoveries integrated. Three independent live browser sessions verified ordinary activity/lunch publication, lunch-only RSVP, independent Tokyo member, shared photo and restored story.                                                                              |
| Validated implementation | Traveler refinement and friend-session fixes deployed and health verified at `553c00210506102c01100c0cca0244102d8b5086` on September 6 at 22:30:24 UTC. Later documentation-only release identities are identified by PR checks and `/api/health`.                                                                 |
| Repository checks        | Latest `pnpm check`: 12 successful tasks, including 83 friends tests; 11 cached tasks and friends tests rerun. Native workerd: 11 passed. Chromium/WebKit: 18 passed at the deployed follow-up. Provider responses in these browser tests are explicit fixtures.                                                   |
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
