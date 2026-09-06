# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; draft [PR #1](https://github.com/the-prairie/adventure-omakase/pull/1). The original history was preserved and joined with the recreated remote main. No merge or production deployment has been performed.

The shared app and travel companion are implemented on the isolated HTTPS preview. **Full live companion acceptance remains incomplete.** Successful direct Google setup tests and deterministic provider fixtures do not complete the deployed journey.

| Gate                  | Observed state                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared app            | Worker, D1, private R2 and all 300 supplied discoveries integrated. Three independent live browser sessions verified ordinary activity/lunch publication, lunch-only RSVP, independent Tokyo member, shared photo and restored story.                                                                              |
| Current runtime       | Preview deployed and health verified at `fddf2cb8a34a5180230a6973d6ef7fe99aa5f392` on September 6 at 20:54:47 UTC. Later documentation/test commits and CI deployment are identified by PR checks and `/api/health`.                                                                                               |
| Repository checks     | Latest `pnpm check`: 12 successful tasks, including 82 friends tests; 11 cached tasks and friends tests rerun. Native workerd: 11 passed. Chromium/WebKit: 14 passed at the deployed implementation. Provider responses in these browser tests are explicit fixtures.                                              |
| Live Google successes | Japanese text translation, synthetic Japanese sign interpretation, walking route, recovered translation draft and explicitly reviewed save to shared story.                                                                                                                                                        |
| Live Google failures  | Places Text Search rejected with daily-quota exhaustion. Audio returned HTTP 503 UNAVAILABLE twice. Invitation generation also returned HTTP 503 UNAVAILABLE, before publication; live AI replan was therefore not reached.                                                                                        |
| Website watches       | Actual public-page baseline, UI scheduling and cancellation passed. Real scheduled check advanced at 21:00:28 UTC with zero failures; test watch cancelled afterward.                                                                                                                                              |
| Backup                | New schema-v5 cloud backup contains populated helper, budget and watch tables and one verified R2 photo. Local populated-table restore tests pass. Earlier schema-v4 cloud restore verified database/photo hashes and restored UI; the new v5 snapshot has not been restored into another fresh cloud destination. |
| Security CI           | A test-only URL substring match reported by CodeQL was replaced with exact parsed-host matching at `cbade78`. CodeQL analysis and security workflow passed at that commit; checks were not disabled or dismissed.                                                                                                  |
| Physical phones       | Not tested. Browser emulation is separate evidence.                                                                                                                                                                                                                                                                |
| Production            | Not deployed. Protected manual main-branch workflow and explicit release approval remain required.                                                                                                                                                                                                                 |

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
