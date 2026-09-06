# Cloudflare friends integration

Status: In progress. Baseline: `20adc46`, clean main checkout, origin `https://github.com/the-prairie/adventure-omakase.git`.

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
| Preview / production       | Preview deployed           | Preview deployed at fddf2cb; production requires protected main-branch approval.                                                                                                  |
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
