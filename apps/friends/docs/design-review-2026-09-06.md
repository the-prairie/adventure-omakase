# Friends interface redesign

The user's screenshot and rejected walkthrough are the starting evidence. The previous release covered selected journeys, not every screen and state. The new pass must cover open controls and dense forms as well as page-level compositions.

## Research translated into decisions

Sources inspected September 6, 2026:

- [Linear's interface redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): align chrome, labels and controls; test the system across view types, density and states. Apply one control vocabulary throughout the app and distinguish content hierarchy from navigation hierarchy.
- [Aman's destinations](https://www.aman.com/hotels-and-resorts): inspected the live browser interface. Its spacious navigation, restrained borders and large landscape imagery give the content room. Borrow the restraint and proportion; keep the friends app's task controls close at hand instead of importing a hotel-marketing page.
- [Apple pop-up button guidance](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons): the page requires JavaScript, so its text was not available to the research fetch. Do not attribute an accessibility implementation claim to that unread content. Native selection remains the form-state authority; the enhanced presentation receives its own keyboard and browser verification.

## Direction

The accepted product brief already commits to a warm editorial travel journal. Retain that identity, replace the generic rounded-card presentation and inconsistent control scale. The primary use is operating the trip while traveling, so typography and whitespace must support action rather than turn each form into a poster.

Grounded systems considered: an edited travel folio, a ryokan guest dossier, a contemporary journey notebook, a museum collection guide, an independent bookstore index, a camera contact sheet, and a ferry day log. The concept seed `8d55f6a2` assigned the third. The journey notebook provides a continuous reading surface, clear dates and compact choices, without fake tickets, stamps or navigation claims.

The dealt arcade and luminous display systems conflict with the explicit no-neon-gaming brief. Industrial fashion, stage lighting and celestial-chart systems lose both audience identification and immediate task clarity; retain only their discipline of consistent state, deliberate hierarchy and spatial continuity. The dense Japanese portal demonstrates useful density but its tiny type and boxed mosaic repeat the user's criticism. Match its information efficiency while preserving readable touch controls.

## Scope and coverage ledger

The screen/state inventory is bounded by the implemented app. It does not claim every possible combination of user data, network timing or physical device.

| Surface            | Current evidence                                                                                                                              | Remaining distinction                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Entry/account      | Owner entry, invalid invitation, personal recovery, recovered session, settings and trip dates captured                                       | Physical-device recovery not tested                    |
| Home/My day        | Empty/populated board, selected day, changed/cancelled invitation captured; private note/calendar behavior in existing journeys               | Not every date/content permutation                     |
| Discover/draw      | Empty/populated list, detail/source, form/result and open selection controls captured; filter persistence and native values tested            | Not all 300 individual details separately photographed |
| Invitations        | Form/detail top and bottom, full/waitlist, reconfirmation and cancellation captured; shared part RSVP and comments in existing journeys       | No real booking or reservation asserted                |
| People/profile     | People and profile top/bottom with travel windows captured                                                                                    | Many-member density not exhaustively sampled           |
| Memories           | Empty/populated book, form and print options captured; photo/restoration/print behavior in existing native journeys                           | Physical camera and every image format not covered     |
| Companion/research | Launcher, all five helper forms and settled results, recent drafts, loading/cancel/unavailable/offline captured                               | Fixture answers are not live model acceptance          |
| Watches            | Empty list and creation form captured; schedule/cancel behavior in existing tests and earlier separate live evidence                          | Every changed-page event composition not recaptured    |
| Shared controls    | Open menus at both widths, keyboard/typeahead/focus/Escape/Tab and linked form values tested; labels inspected in Chromium accessibility tree | Full screen-reader/device matrix not tested            |
| Cross-cutting      | Both engines and widths, overflow checks, reduced-motion captures, offline and real stale-release rejection                                   | Browser emulation is not physical-phone verification   |

Screenshots use synthetic content. Provider fixtures prove presentation and interaction only; live AI acceptance is recorded separately.

## Implemented system and evidence

The shared paper/forest palette now uses one self-hosted Source Serif Display face, flat content rows, compact form headings, consistent touch controls and SVG action icons. Region, area, mood and duration selections use one progressive, native-backed combobox presentation. It supports keyboard arrows, typeahead, Home/End, Enter, Escape and Tab, preserves form values and linked options, and places menus above modal clipping. Browsers without the popover API retain native selection. Discover's secondary filters stay collapsed until requested. Travel-window fields and helper actions fit a narrow viewport; file selectors share the control treatment.

`tests/native/design.spec.mjs` captures 48 named surface positions at 1344×960 and 390×844, including five settled helper results. `controls.spec.mjs` captures open menus at both widths and verifies native form synchronization, linked areas, focus, modal Escape, typeahead and filter expansion. `states.spec.mjs` captures 16 invitation, recovery and failure positions at both widths. The existing native journeys cover source-backed invitation confirmation, lunch-only participation, shared R2 photos, comments, private notes, calendar download, restoration and service-worker upgrade. All run against isolated native workerd, D1 and R2; AI results are explicit fixtures.

Local evidence lives under the ignored `.impeccable/review/friends-2026-09-06/` packet and `apps/friends/evidence/`. Screenshots are inspected, not simply generated. Invalid loading captures found in review were replaced by waits for completed results. A mismatched research fixture was corrected to return a research answer instead of translation JSON. These are test-evidence fixes, not live-provider success.

Coverage is finite. Physical-phone behavior, microphones, every content permutation, assistive-technology combinations, external destination pages and live provider availability remain separate from the desktop/mobile browser walkthrough. The review makes no claim of universal path coverage or user-study validation.
