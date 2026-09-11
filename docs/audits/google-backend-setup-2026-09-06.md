# Google backend setup — September 6, 2026

Google credentials are installed on `adventure-omakase-friends-preview`. Direct provider tests passed for text, translation, tool calling, Places and Routes. This is infrastructure evidence, not acceptance of the uncommitted companion implementation.

## Resources

- **Adventure Omakase**: `adventure-omakase-friends` (`77269549045`), personal organization `ya-its-larry-org`, labels `app=adventure-omakase`, `environment=preview`. Gemini uses the free tier with no billing attachment. Attaching the existing personal billing account failed because of Google's billing-project quota.
- The user explicitly approved existing billed personal project **amateur-time** (`77767987037`) for Maps. Only Places API (New) and Routes were added; pre-existing unrelated services were preserved.
- Service account: `adventure-omakase@adventure-omakase-friends.iam.gserviceaccount.com`. No project IAM roles granted; no user-managed service-account keys. Gemini uses a service-account-bound authorization key restricted to `generativelanguage.googleapis.com`.
- Maps key **Adventure Omakase Server** is restricted exclusively to `places.googleapis.com` and `routes.googleapis.com`. No HTTP-referrer or IP restriction was added: a normal Worker does not have dedicated fixed egress. Keep it server-side.
- The new project has only Generative Language, Service Usage and Service Management enabled after removing Google's automatically enabled unrelated services.
- Wrangler confirmed `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` as `secret_text` bindings on the named preview Worker. Existing `SETUP_KEY` remains.

## Cost controls

| Maps method                                           | Per minute | Per day |
| ----------------------------------------------------- | ---------: | ------: |
| Text Search                                           |         10 |      20 |
| Nearby Search                                         |         10 |      20 |
| Place Details                                         |         10 |      50 |
| Compute Routes                                        |         10 |      50 |
| Autocomplete, photo/media/review search, route matrix |          0 |       0 |

These are observed effective project quotas after consumer overrides. Gemini's existing free-tier limits for `gemini-3.8-flash` were retained: 5 requests/minute, 20 requests/day, 250,000 input tokens/minute. Multi-turn tasks may consume several requests.

Created **Adventure Omakase Maps testing**, a $5 monthly alert-only budget scoped to `amateur-time` and Places API (New)/Routes. Alerts at 50%, 90% and 100% go to billing admins/users; savings remain included. The budget page showed $0.00 reported cost, but Google states reporting can lag by more than 24 hours. Final invoiced test cost is not yet known. No funds were prepaid or plans upgraded. These controls are not a hard cumulative US$5 cap.

## Live verification

| Test                              | Observed result                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Gemini basic response             | PASS: `OK`                                                                                                     |
| Japanese text translation         | PASS: translated a question asking directions to Namba Station                                                 |
| Gemini function calling           | PASS on retry: structured `lookup_place` call for Namba Station Osaka; initial request timed out at 30 seconds |
| Places Text Search                | PASS: Brooklyn Roasting Company Namba, structured ID, address and coordinates                                  |
| Place Details after quota changes | PASS: same venue returned                                                                                      |
| Walking route                     | PASS: 426 metres, 374 seconds between two Namba-area coordinates                                               |
| Encrypted secret installation     | PASS: both binding names listed                                                                                |
| Preview health after installation | PASS: release `42cbbf88aa052f7f92c295245aa0a94af6d09238`                                                       |

Provider tests ran from the operator host using public/synthetic prompts, not the deployed companion request path. No private trip information or personal photos was submitted.

Synthetic inline-image input also passed on retry: Gemini correctly identified a red test image. The initial smaller image request returned an HTTP error; the successful retry used a 64-pixel PNG with default thinking settings. This is basic image-input evidence, not Japanese menu recognition acceptance.

## Credential audit

The first key creation unexpectedly printed its value in gcloud operation output despite a metadata-only format. That key was immediately deleted successfully, never installed in Cloudflare, and replaced with command output suppressed. gcloud also logged retrieval output locally; those task log values were redacted. Subsequent retrieval disabled file logging and passed secrets in memory through stdin to Wrangler. No repo secret files or credential screenshots were created.

A value-based scan found zero current-key matches in repository files, recent gcloud/Wrangler logs and shell history. The revoked credential remains in the earlier tool transcript; this is not a claim of no exposure.

## Remaining release work

The deployed preview remains on its earlier release. This setup did not edit or deploy the active companion code. Release that implementation through its normal checks, then run authenticated end-to-end acceptance. Real Japanese menu/sign-photo quality and physical-phone acceptance remain untested.

More Gemini capacity requires a separate billing decision. Moving Maps into the isolated project requires resolving Google's billing-project quota. Current Maps quotas are project-wide, so future unrelated Maps users in `amateur-time` would share them.

References: [Gemini authorization keys](https://ai.google.dev/gemini-api/docs/api-key), [Gemini billing](https://ai.google.dev/gemini-api/docs/billing), [Maps security](https://developers.google.com/maps/api-security-best-practices), [Routes quotas](https://developers.google.com/maps/documentation/routes/usage-and-billing).

Documentation verification: `pnpm check` passed under Node 24.19.0 and pnpm 11.22.0, invoked with `npx --yes --package=node@24.19.0 --package=pnpm@11.22.0 -c 'node --version && pnpm check'`. Formatting and lint ran; Turbo reused successful typecheck/unit-test cache entries. This does not replace live provider or deployed acceptance.
