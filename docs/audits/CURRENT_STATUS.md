# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; preserved baseline `20adc46`. Integration is committed at `56e49ed`; `76f35c8` joins the recreated main history. The recreated remote main (`d321935`) was joined without rewriting either history.

| Gate               | Observed state                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared app         | Integrated Worker, D1, R2 and 300 supplied discoveries; shared HTTPS preview deployed at `981a5f2`                                                               |
| Native runtime     | 11 workerd smoke checks passed                                                                                                                                   |
| Browser            | 10 native browser tests plus 2 hostile-name rendering tests passed Chromium and WebKit, including controlled clock/visibility lifecycle checks; no network mocks |
| Repository         | `pnpm check`, database migration, integration tests, production-mode build, development E2E and production-container E2E passed                                  |
| Preview            | Preview is live; restore D1/R2 isolated and provisioned; full restore round-trip in progress                                                                     |
| CI deployment      | Preview deployment, native/browser and repository CI passed at `981a5f2`; CodeQL alerts are being addressed                                                      |
| Production         | Protected manual main-branch workflow; reviewer approval required; not deployed                                                                                  |
| Backup and restore | Separate destination required; cloud round-trip pending                                                                                                          |
| Ask Omakase        | Integrated implementation passes 66 fast tests; live model returned validated cards in 21.5 seconds; deployed journey pending                                    |
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
