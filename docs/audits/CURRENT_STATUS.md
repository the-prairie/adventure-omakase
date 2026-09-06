# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; preserved baseline `20adc46`. Integration is committed at `56e49ed`; `76f35c8` joins the recreated main history. The recreated remote main (`d321935`) was joined without rewriting either history.

| Gate               | Observed state                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared app         | Integrated Worker, D1, R2 and 300 supplied discoveries; shared HTTPS preview deployed at `76aa4af`                                                               |
| Native runtime     | 11 workerd smoke checks passed                                                                                                                                   |
| Browser            | 10 native browser tests plus 2 hostile-name rendering tests passed Chromium and WebKit, including controlled clock/visibility lifecycle checks; no network mocks |
| Repository         | `pnpm check`, database migration, integration tests, production-mode build, development E2E and production-container E2E passed                                  |
| Preview            | Preview is live; restore D1/R2 isolated and provisioned; full restore round-trip passed                                                                          |
| CI deployment      | Preview deployment, native/browser and repository CI passed at `76aa4af`; CodeQL and Gitleaks passed                                                             |
| Production         | Protected manual main-branch workflow; reviewer approval required; not deployed                                                                                  |
| Backup and restore | Cloud D1 snapshot + R2 photo restored to isolated destination; database and photo hashes verified                                                                |
| Ask Omakase        | Integrated implementation passes 68 fast tests; live model returned validated cards in 21.5 seconds; deployed journey pending                                    |
| Physical phones    | Not tested; browser emulation is separate evidence                                                                                                               |

## CI deployment credential

The user added `CLOUDFLARE_API_TOKEN` in GitHub Settings → Environments → cloudflare-preview → Environment secrets. Scope the token to the selected Cloudflare account with Workers Scripts Edit, D1 Edit and Workers R2 Storage Edit. Production uses the same secret name in its separately approved environment. Never paste tokens into a conversation. This credential is separate from model/search access; Wrangler OAuth remains local and is not copied into CI.

## Live provider checkpoint

The direct real Workers AI run returned two validated options with separate activity/lunch parts and exact source quotations in 21,478 ms: 2 provider calls, 3 public source reads, 6,715 input tokens, 2,185 output tokens, 362.635 measured neurons; usage-equivalent price $0.003989. This is a model/tool preflight, not completed deployed acceptance. One alternative was too far from the chosen area; the shortlist now prioritizes matching local areas, but that revision has not yet had a successful live run.

Development probes exhausted the account's free 10,000-neuron allowance. The provider explicitly rejected further inference. No paid subscription has been enabled. The single pending user choice is enabling Workers Paid for continued testing today or retaining the free plan until its 00:00 UTC reset. Deterministic fixtures do not complete this gate.

## Companion acceptance

Implement Find something for me, Check this idea and editable invitation confirmation using authenticated member context and canonical domain actions. Asia/Tokyo dates, default trip September 26–October 14, 2026. The bounded live acceptance must create Osaka activity + lunch, join lunch only from another context, leave the Tokyo friend unassigned, and require reconfirmation after a meeting-point edit. Record live provider evidence separately from deterministic fixtures. No simulated completion or background-work promise.

The manual workflow is unavailable until its file exists on the default branch. Same-repository PRs therefore deploy only the isolated preview after its own required checks; production remains manual and main-only. Draft PR: https://github.com/the-prairie/adventure-omakase/pull/1.

## Remote D1 compatibility finding

On the isolated preview database the REST query endpoint rejected `SELECT CASE WHEN ... THEN RAISE(...) END` inside a trigger with `incomplete input`, while an equivalent `SELECT RAISE(...) WHERE ...` trigger succeeded. The probe trigger was removed. The failed initial migration left only Cloudflare metadata and the migration ledger, with no application tables. Initial migration guards now use the equivalent WHERE form; existing race/capacity/ownership tests remain the acceptance gates.

## September 6 final evidence checkpoint

All six PR checks passed at `76aa4af`: repository validation, native/browser checks, preview deployment, CodeQL workflow, CodeQL analysis and Gitleaks. The bounded research-loop regression at `7343c9f` allows a requested new discovery to be searched and checked before the final answer, without increasing the four-model-turn/four-tool/four-source limits. Its `pnpm check` (12 tasks, including 68 friends tests) and 11 native workerd checks passed; the final PR checks and exact deployed revision are available on PR #1 and `/api/health`.

The ordinary live HTTPS journey passed on three independent browser sessions: the host published September 29 activity/lunch parts, B joined lunch only, and the Tokyo member remained unassigned. B uploaded a synthetic image to real R2; A loaded and decoded the shared photo. This is ordinary-app evidence, not AI acceptance. Sanitized reports and inspected mobile/desktop screenshots are in [evidence/live](evidence/live/ordinary-live.json).

A version-4 backup containing three members, one plan, one RSVP, one memory and one photo restored successfully into the separate restore D1/R2 resources. All database and photo hashes verified. The restored browser displayed the records and decoded the photo. Ask tables were empty in this snapshot, so this cloud round-trip does not demonstrate restoration of populated AI tasks. The authenticated cleanup route removed a seeded expired row using the deployed cleanup handler; an actual scheduled cron firing has not been observed.

## Try the preview

Open https://adventure-omakase-friends-preview.thelaurenzary.workers.dev. Owner access is in the private local file `apps/friends/.deploy/preview/OPEN_MY_TRIP.html`; it must not be committed or shared publicly. It opens the synthetic acceptance trip. Use Invite friends inside the app for another browser/device. New production trips remain empty apart from the owner.

For the companion, set explicit Osaka travel dates and preferences, choose September 28, 2026, Namba, 10:00–14:00, then ask for something unusual followed by lunch. Review the sourced cards and editable separate parts before confirming. From another member, join lunch only and inspect My day; edit the meeting point as host and verify reconfirmation. The committed `apps/friends/scripts/live-acceptance.mjs` runs this bounded journey with actual HTTPS/model/backend after quota is available; `--ordinary` deliberately excludes AI. No background retry is scheduled.

Runtime: Cloudflare Worker + D1 + private R2, Workers AI binding with `@cf/openai/gpt-oss-120b`, bounded public-page research and one external search. Per task: 75 seconds, four model turns, four tool calls, four sources, one repair and a 3,000-neuron reservation; per trip/day 8,000 reserved neurons and per member/hour four requests. See ADR 0007 for accounting and cancellation limits.

Remaining gates: revised shortlist and full deployed live-model acceptance, physical iPhone/Android checks, and explicit merge/production approval. No production deployment or paid subscription was performed.
