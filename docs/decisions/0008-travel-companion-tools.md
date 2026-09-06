# ADR 0008: Bounded travel tools in the shared fieldbook

Status: Accepted for isolated preview implementation, September 6, 2026. Live provider acceptance remains a separate gate.

## Decision

Keep the companion inside the same authenticated friends app. Gemini 3.8 Flash supplies structured suggestions and text/photo/audio interpretation when `GEMINI_API_KEY` is configured; the existing Workers AI adapter remains the fallback for ordinary Ask. Google Places API (New) and Routes API require `GOOGLE_MAPS_API_KEY`. Credentials remain Worker secrets. Preview compute uses a US placement hint (`gcp:us-central1`) because the Gemini API is not available from every global edge region; this is a placement preference, not a data-residency guarantee. Upstream error responses remain the acceptance evidence. No external chat or map iframe replaces the app.

Venue research issues one Places lookup, reads at most three returned public venue websites through the existing SSRF guards, then requests one source-only Gemini answer. Ask's explicit new-place search uses Places with independently read website evidence. Built-in Gemini Google Search is disabled: its variable number of billed searches has no documented enforceable per-request limit. The UI describes the narrower venue-research scope.

Every paid call atomically reserves from one durable deployment-wide US$5 lifetime ceiling, matching the user's testing authorization. A token-only Gemini request reserves US$1.05 at the current rates, or US$2.10 from January 2027: its full published input/output capacity costs at most US$1.032192 or US$2.064384 respectively. It forces one candidate and rejects built-in paid tools. Success settles reported usage; failure consumes the full reservation because a failed response does not prove no charge. Places reserves US$0.05 and Routes US$0.02 per single request. Free allowances are not needed for the bound. Provider invoices remain the billing record. The conservative reservation can refuse requests before the apparent remaining balance is zero; resetting or increasing the allowance is not an automatic feature.

Translation and memory media are submitted only by explicit action, resized in the browser where applicable, and never retained by the app. Private helper text results expire after seven days and can be recovered through Recent drafts. Saving a reviewed memory uses the ordinary memory form. Places, route and venue-research results are transient; the task record contains only a fresh-check notice. Google Maps attribution and public terms/privacy pages accompany the tools.

Host replanning includes the reference invitation's contents, preserves existing part labels and IDs, checks the final edited times against other commitments, and calls the same revision-checked canonical update as ordinary editing. A changed invitation requires friends to reconfirm. The model cannot publish; confirmation is idempotent and fails if the trip changed meanwhile. Adding/removing parts remains an ordinary manual edit.

Website watches require explicit confirmation, one public URL, and a deadline of 1 hour to 14 days. At most three are active per member. Cloudflare checks up to five due watches per 15-minute trigger, with approximately hourly per-watch scheduling and atomic leases/cooldown. Change events are private and in-app only. Three failed reads pause the watch. The watch detects limited readable page text, not inventory, reservations or arbitrary script-rendered content. Cancellation stops future claims. Restore environments disable watches to avoid replaying jobs.

D1 migration 0003 adds private helper/watch tables, the durable budget, and an idempotent edit reference. Version-5 backups include these tables; older backups restore with empty new tables. Existing PostgreSQL migrations remain untouched.

## Verification boundary

Deterministic protocol and native workerd/browser tests verify contracts, isolation and UI behavior. They do not establish Gemini/Google access or model quality. An actual preview walkthrough with live providers, inspected video, observed provider usage and exact release identity is still required. Physical microphones and phones remain distinct from desktop browser tests.

## Primary references

- [Gemini model limits](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [GenerateContent and tool configuration](https://ai.google.dev/api/generate-content)
- [Google Search billing](https://ai.google.dev/gemini-api/docs/google-search)
- [Places attribution and policies](https://developers.google.com/maps/documentation/places/web-service/policies)

The unmodified Google Maps logo in `apps/friends/public/google-maps.svg` comes from the official attribution-assets ZIP linked by the Places policy page.
