# ADR 0009: Booking documents propose incremental profile updates

Status: Accepted for friends preview implementation, September 7, 2026.

## Decision

A traveler may choose booking images or PDFs while joining, or upload, drop or paste images in their profile later. The join button explicitly changes to “Join and read my booking”; identity is established before the private model request. Choosing a file in the profile does not submit it until Read booking. Manual profile editing remains available when the provider is absent, unavailable or quota-limited.

Use the existing authenticated travel-task boundary and bounded Gemini adapter. One extraction sends at most four inline JPEG/PNG/WebP/PDF files totaling 4.5 MB after browser image resizing, with no public file URL, web tools or booking actions. Validate file signatures, base64, result shape, real calendar dates, source indexes and date ordering. The source is untrusted data, never instructions. Files are never persisted in D1, R2, shared memories or logs. Result drafts are member-scoped and follow the existing seven-day cleanup; operational backups remain subject to their own retention. Google processing and retention are described in the existing privacy disclosure.

Only the display name and coarse regional travel windows can be copied into the ordinary profile form. Evidence and uncertainty remain in the private draft. Exclude booking references, street/property/room details, identity/payment details and inferred preferences from shared fields. The person explicitly chooses whether a proposal adds a window or updates an existing one; missing extracted fields preserve existing values. Exact duplicates are not added. Saving the profile remains a separate explicit action, and all fields can be edited or removed later.

A flight into Japan supplies the destination-local arrival date, not the origin departure date. Missing departure, arrival or neighborhood stays blank. A year inferred from a single-year trip is always flagged and requires acknowledgment; an ambiguous trip year cannot supply dates. A screenshot does not prove a booking remains valid, and schema checks do not prove OCR/model correctness. The interface retains the source preview while the form is open and shows the extracted evidence for review. This is assisted entry, not an absolute-accuracy guarantee.

Profile windows now accept either missing bound. Open bounds do not extend across the group trip or claim a day-by-day overlap. Profile updates send the original name/profile snapshot and use a conditional D1 write, rejecting changes from stale tabs without generating a false update event. A response cannot reopen a dismissed form. Closing an extraction records cancellation and discards its UI result; an already-running provider call may still consume usage.

## Schema and release

D1 migration `0004_profile_import.sql` copies all existing helper rows into an identical table with the additional `profile-import` kind, then replaces the old table. No table references the helper table. Version-6 backups support the new kind; versions 3–5 remain accepted. Existing PostgreSQL migrations are untouched. Take an operational backup before applying the new migration. No spending ceiling or provider quota is raised by this feature.

## Verification

Tests cover attachment limits/types, invalid dates and model shapes, inferred-year flags, private/idempotent extraction, open-date persistence, stale-profile rejection, populated migration preservation and version-6 restoration. Native browser tests use synthetic source images/PDFs and explicit provider fixtures for join-to-import, later accommodation updates, duplicates, manual edits, cancellation and offline failure. Those tests do not prove live Gemini extraction quality; live verification is recorded separately in CURRENT_STATUS.

Google documents inline PDF input in its [document understanding reference](https://ai.google.dev/gemini-api/docs/document-processing). The app's limits are deliberately smaller than the provider maximum.
