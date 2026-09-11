# Reading and acting on a trip

Use one authenticated member session, the same origin and the ordinary plan API.
The browser and agent read the same decision model. All dates and times below are
in Japan; server observation time is explicitly named separately.

## Read only what the next decision needs

1. Read `/api/context?date=YYYY-MM-DD` for the chosen trip day. Preserve its `seq`,
   `release`, member identity, plan IDs and revisions.
2. Follow a plan's `detail` route for host notes, comments and full acceptance
   details. Search `/api/catalogue?region=osaka&q=coffee&limit=12` for research
   leads, or `/api/catalogue?id=<id>` for a linked place. Follow `nextOffset` for
   another page; the limit is at most 30. IDs come from the response, never titles.
3. Re-read the observation's `read.next` route when needed. A 204 means no recorded
   trip change; reuse the previous observation. It does not report physical events.

The compact view omits private memories and helper files. The full state endpoint
continues to enforce its existing privacy rules. Do not retrieve unrelated private
material to fill gaps in another member's intentions.

## Interpret decisions precisely

- `response` distinguishes `unanswered`, `declined`, `interested`, `waitlist` and
  `joined`. Hosting an idea is `tentative`; it does not make its host a dinner RSVP.
- `participation=solo` is a shared heads-up with joining disabled. `meet-afterward`
  permits only the returned named options. Do not infer either rule from comments.
- `current` contains the plan's current terms. `accepted` contains the joined
  member's last recorded terms, or null when there is no historical receipt.
- `needsReconfirmation`, `changes`, `notesChanged` and `missingPart` identify what
  needs review. Never silently treat a changed meeting or removed part as accepted.
- `scheduleHold` is conservative conflict context. It includes tentative host
  ideas and joins awaiting reconfirmation. A free-looking interval is not consent,
  availability, a known location or a feasible travel connection.
- `costLimit` is a proposed whole-yen ceiling per person for this outing. Null is
  unknown; zero is zero. It is not a daily budget, actual spend or a verified price.

## Use existing guarded actions

Each plan exposes available actions and, where applicable, a `reply` method, path,
revision and permitted statuses. Use a returned option ID as `choice`. For decline,
no part selection is needed. `leave` clears the reply back to unanswered; it is
separate from an explicit decline. An unchanged capacity preview cannot reserve a
place: the database rechecks it when the reply is submitted.

Send same-origin writes using the observation's `writeHeaders`. Plan creation uses
`POST /api/plans` with a durable `requestId`, title, region, area, date, start/end,
meeting, kind, joinStyle, segments, optional catalogueId and optional costLimit.
Edit uses `PUT /api/plans/:id` with the current revision. Full plan responses are
ordinary form-shaped inputs; keep fields that were not requested to change. Host
status changes use `POST /api/plans/:id/status` with the current revision.

After a successful write, read its canonical plan or updated day. A stale revision
or release is a request to reread and reconsider. Do not blindly replay a different
choice. After a timeout, inspect state before retrying; reuse the same create
request ID to avoid a duplicate. Research results and optimistic UI are not receipts
of a committed write.

## Keep the evaluation separate

For a fictional traveller run, give each traveller their own session and private
working memory. Let the traveller decide; do not add comments or commitments to
make a story more interesting. Record the requested action, observed response and
canonical result. Keep public fiction disclosure in the observer/journal layer.

A recorded plan, a host completion mark, a booking, an actual visit, a payment and a
written memory are different facts. The app does not supply a physical world clock
or evidence of unobserved travel. A subsequent simulation must model those outside
the planning app and identify their provenance explicitly.
