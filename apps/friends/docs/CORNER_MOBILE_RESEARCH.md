# Corner mobile reference and Adventure Omakase adaptation

Observed September 11, 2026. The request was to research Corner and copy useful
mobile design and functionality into the existing app after its place details
became crowded and awkward.

## Evidence and access limits

- [Corner](https://www.corner.inc/) describes a community map for discovering and
  collecting places. Its public material supplies positioning, not implementation.
- [Corner on the Canadian App Store](https://apps.apple.com/ca/app/corner-curate-share-places/id1668282277)
  describes saving places, collections, sharing links, following friends and
  personalised discovery. These are advertised capabilities, not independently
  tested native flows.
- [Mobbin's Corner reference](https://mobbin.com/apps/corner-ios-59299513-be08-4409-95f2-9db957b978ed)
  offered four accessible highlighted screens. Its complete 219-screen collection
  was behind a paid access boundary and was not inspected. No native installation,
  private API extraction or proprietary source-code access was used.

## Patterns observed and implemented

| Observed reference                                         | Adaptation in this app                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map with light floating controls and compact navigation    | Persistent map/list selection beside search; region chips, saved scope and expandable filters; map retains the selected place and area                    |
| Place name, category and save control above the photograph | Compact title and private save state at the top of the place sheet, with credited existing photographs                                                    |
| Short description and a row of small external actions      | Place summary followed by Map, Maps search and Source; no automatic embedded map in every place sheet                                                     |
| Context about friends near the place                       | Existing actual recommendations and open invitations remain visible; no invented popularity or friend activity                                            |
| One primary bottom action                                  | Sticky invitation action opens the existing editable plan, with dates and a meeting point still required                                                  |
| Separate editing/details surfaces                          | Optional experience guide, practical details and research sources expand independently; sources remain accessible and operational warnings remain visible |
| Collections and a personal map                             | Existing curated outings and dice sit behind one entry; Saved uses the existing private pick records and works with map filtering                         |

The mobile visual system uses white surfaces, near-black actions, softly tinted
secondary controls, self-hosted Inter 4.1 display titles (SIL Open Font License; rsms.me/inter), rounded photos and 44px minimum
primary touch targets. Desktop keeps the established paper palette while sharing
the simpler information hierarchy. Corner's logos, text, photography and
proprietary assets are not shipped.

## Deliberate product boundaries

Corner's visited ratings, public follows, social-import automation and custom
collection editing are not implemented by this change. Omakase already has
private memories, shared trip recommendations and curated outing plans; those
retain their meaning. A saved place does not imply a visit, recommendation,
RSVP, booking or availability check.

Maps continue to distinguish sourced site locations from approximate area
anchors. This redesign adds no live location, venue hours or route guarantees.
External map actions are explicitly searches. Water and separate-stay warnings
remain outside the collapsed sections.

## Verification

`tests/native/corner-mobile.spec.mjs` exercises the complete phone flow: browse,
search, private save, reload, saved filtering, inspect sources, create an editable
invitation, filter by area, switch map/list, roll a local idea and check overflow
at 320, 393, 430 and 1440 pixels. Existing tests follow the new disclosure paths.
Observed final command results and publication evidence are recorded separately
in the release status; the presence of a test is not a passing result.
