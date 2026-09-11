# Friends edition operations

Use the root Node 24.19.0 / pnpm 11.22.0 toolchain. The only traveler production app is `apps/friends`; `/example.html` is a clearly labeled fictional example using independent demo storage. Never send that example as the group invitation.

## Local development

```sh
pnpm install --frozen-lockfile
cp apps/friends/.dev.vars.example apps/friends/.dev.vars
pnpm --filter @adventure-omakase/friends db:local
pnpm dev:friends
```

Use a strong local-only `SETUP_KEY` in the private vars file. Open `http://localhost:8787/#setup=YOUR_LOCAL_KEY` privately to create a synthetic local trip. The fragment is not sent in URL requests. Do not paste real credentials into chat, screenshots or issues. Local Wrangler uses simulated D1/R2; the adapter fallback is a separate fast testing tool.

## Inventory and setup

Run `pnpm --filter @adventure-omakase/friends exec wrangler whoami`. Inspect the account's Worker, D1 and R2 inventory before setup. Do not enable billing or change unrelated services from these scripts. R2 must already be enabled by the account holder.

`pnpm --filter @adventure-omakase/friends cloudflare:setup --env preview` creates/resumes only `adventure-omakase-friends-preview` and its explicitly named D1/R2. Production and restore are separate environments. All three names and bindings are in `wrangler.jsonc`. Bare Wrangler development binds local resources. Never use `--remote` for local tests.

Setup checks every resource namespace before provisioning, retains private progress under `.deploy/ENV/operator.json`, and refuses to silently adopt an existing deployment without its record. Commit non-secret resource identifiers after setup. If the record is lost, inspect existing data and recover the credential from the operator; do not create a new trip over it or generate another random installation.

## Deploy and verify

```sh
OMAKASE_URL=https://adventure-omakase-friends-preview.thelaurenzary.workers.dev \
  pnpm --filter @adventure-omakase/friends deploy --env preview
```

Deploy requires a clean committed checkout, an explicit environment, a matching HTTPS origin, fast checks, native workerd and Chromium/WebKit browser tests. It publishes content-hashed assets and the exact Git SHA, applies only the selected D1 migration sequence, then verifies Worker health and `release.json` agree with the commit. CI does not read `.deploy`; its URL and Cloudflare credential come from configured environment variables/secrets. Missing URL or failed health is a failure, never a skipped success.

Production uses the manual `Deploy Cloudflare friends` workflow from main and the protected `cloudflare-production` environment. Review/merge and deployment approval remain human actions. The workflow does not create resources, change DNS, merge PRs or manufacture secrets. Configure a scoped Cloudflare API token as the environment's `CLOUDFLARE_API_TOKEN` secret using the dashboard or `gh secret set`; never copy Wrangler's temporary OAuth token to CI. Set `OMAKASE_URL` as that GitHub environment's variable.

The production assets do not expose `.deploy`, `.dev.vars`, test fixtures or backups. Worker health exposes only operational release metadata. An older open tab's mutations reject and ask for a reload. Service-worker activation removes previous omakase caches; no API/photo data is cached by it. Offline last-view snapshots are unconfirmed and remain only in that tab's session storage.

## Owner and friends

After a deployment, run `pnpm --filter @adventure-omakase/friends owner:launch --env preview` (or the approved production environment). It installs the private operator secret and writes `.deploy/ENV/OPEN_MY_TRIP.html`. The file is owner-only. Open it privately, choose your name and trip title; then use **Invite friends**. The group link is reusable and any member may forward it. Forwarding grants participation, and display names are not verified identities.

The group invitation is not the owner launch credential. New devices cannot claim an existing name. A member may make a personal device link; the owner can help recover another member in Trip settings. Removing a member revokes sessions and cancels their open plans. Replacing the group link stops future use of the old link but does not sign out current friends.

## Metadata and photos backup

```sh
OMAKASE_ENV=preview pnpm --filter @adventure-omakase/friends backup
```

The full backup includes private records and invitation/recovery material, and every referenced ready photo. It excludes session cookies. Each photo and the metadata file are SHA-256 verified; `manifest.json` with `complete: true` is the completion marker. The UI's snapshot is not this disaster-recovery backup.

During the trip, run a complete backup daily and before migrations, keeping an encrypted off-account copy. No off-account scheduling is implicitly installed. Originals are not stored: the app keeps resized JPEG copies, so retain phone originals separately. Shared-book exports are for the group; keep private editions private.

Booking import uses migration `0004_profile_import.sql` to preserve existing helper rows while extending their kind constraint. Full backups now use schema version 6; restore accepts versions 3–6. Booking attachments are never stored, so backups include private extraction drafts, not source files. Take a complete backup before applying this migration.

## Restore safely

Provision and deploy the separate `restore` environment without creating a trip, then install its operator secret with `owner:launch --env restore`. Do not open its launch form. Run:

```sh
pnpm --filter @adventure-omakase/friends restore /absolute/path/to/complete-backup --env restore
```

The tool checks destination URL, account, Worker and D1 IDs against the private record; rejects a nonempty destination; verifies all checksums; asks for the explicit empty-target confirmation; enables maintenance; imports regenerated validated SQL; uploads photos; checks metadata equivalence and all photo hashes; then disables maintenance. It never erases the source trip. A failure stays in maintenance for inspection; do not blindly retry a partial import. The new owner device link repairs identity without restoring old session cookies.

## Cleanup, rollback and limits

The daily cron removes bounded batches of abandoned/expired photos and expired auth/rate-limit records. The seven-day memory undo period preserves photos until it expires. Inspect cron events/errors in Cloudflare, not just homepage health. No push notification, live venue-hours, transport-route or swimming-safety guarantee exists.

A Worker rollback changes code, not D1 schema or data. Before migration, take a full backup. Use forward-compatible migrations, retain the previous release's identity, and roll back code only while compatible with the current schema. If data recovery is needed, restore separately and verify before proposing any traffic switch. Never test by wiping the live database.

Account quotas are shared. Inspect actual Workers CPU/errors/request counts, D1 reads/writes and R2 storage/operations. A 500 MB app photo budget is not a spending cap or a zero-dollar promise.

## Remaining phone acceptance

On actual iPhone and Android browsers: join and reopen; join only coffee; edit/reconfirm its meeting point; upload an actual camera image and verify orientation/format; interrupt/reconnect the network; remove/undo; open from the installed shortcut. Desktop WebKit/Chromium emulation is not evidence for these physical-device gates. Record results in `docs/audits/CURRENT_STATUS.md`.

## Ask Omakase

Preview and production declare a server-side `AI` Workers AI binding. The local default and restore environment do not. No browser model credential is used. The ordinary app remains usable when inference is unavailable. Model/search behavior, limits and data boundaries are recorded in ADR 0007.

For opt-in real-provider acceptance on the isolated synthetic preview, run `node scripts/live-acceptance.mjs` from this app with `OMAKASE_EXPECTED_SHA` set to the deployed commit. It uses the existing private preview operator record, refuses to edit a trip without the synthetic acceptance title, keeps browser sessions in `.deploy/preview/live-acceptance`, and writes sanitized evidence under `evidence/live`. `--ordinary` exercises shared profiles/photo storage without claiming AI evidence. Never run this in routine CI or against production. Fixture tests are in `tests/native/ask.spec.mjs` and use a test-only provider entry point.

A provider quota error does not authorize a subscription change. Cloudflare's free AI allocation is account-wide and resets at 00:00 UTC. App budgets do not reserve account capacity against unrelated tools or development probes. Task usage reports distinguish measured tokens/neurons from unknown usage, and use conservative reservations for interrupted provider calls.
