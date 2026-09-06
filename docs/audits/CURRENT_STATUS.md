# Current release status

Checkpoint: September 6, 2026. Branch `codex/cloudflare-friends-integration`; preserved baseline `20adc46`. Integration changes are uncommitted at this checkpoint. The recreated remote main (`d321935`) will be joined without rewriting either history.

| Gate               | Observed state                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Shared app         | Integrated Worker, D1, R2 and 300 supplied discoveries; no shared deployment yet                                                |
| Native runtime     | 11 workerd smoke checks passed                                                                                                  |
| Browser            | All 6 native browser tests passed Chromium and WebKit, including controlled clock/visibility lifecycle checks; no network mocks |
| Repository         | `pnpm check`, database migration, integration tests, production-mode build, development E2E and production-container E2E passed |
| Preview            | Isolated preview and restore D1 and R2 provisioned; authenticated local deployment available after committed checks             |
| CI deployment      | `CLOUDFLARE_API_TOKEN` absent in repository and preview/production environments; no successful CI claim                         |
| Production         | Protected manual main-branch workflow; reviewer approval required; not deployed                                                 |
| Backup and restore | Separate destination required; cloud round-trip pending                                                                         |
| Ask Omakase        | Amendment accepted; implementation and live-provider verification pending                                                       |
| Physical phones    | Not tested; browser emulation is separate evidence                                                                              |

## CI operator action

Add `CLOUDFLARE_API_TOKEN` in GitHub Settings → Environments → cloudflare-preview → Environment secrets. Scope the token to the selected Cloudflare account with Workers Scripts Edit, D1 Edit and Workers R2 Storage Edit. Production uses the same secret name in its separately approved environment. Never paste tokens into a conversation. This credential is separate from model/search access; Wrangler OAuth remains local and is not copied into CI.

## Companion acceptance

Implement Find something for me, Check this idea and editable invitation confirmation using authenticated member context and canonical domain actions. Asia/Tokyo dates, default trip September 26–October 14, 2026. The bounded live acceptance must create Osaka activity + lunch, join lunch only from another context, leave the Tokyo friend unassigned, and require reconfirmation after a meeting-point edit. Record live provider evidence separately from deterministic fixtures. No simulated completion or background-work promise.
