# September 11 interface quality audit

The user rejected the version 10 phone layout. The review covers the current
friends browser application, using fictional example data and isolated local
workerd accounts. It does not claim physical-iPhone, live-provider or field
acceptance. The surrounding ChatGPT Share/Edit controls are host UI.

## Findings and implemented corrections

| Finding                                                                                       | Correction                                                                                                                          | Evidence                                                                              |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Repeated heading, regions and controls displaced the first discovery                          | Compact search/list-map opening; regions in Filters; one saved/filter/add row; first full place name above the dock                 | 393×620 viewport assertion and inspected image; 320/430/768/1440 width checks         |
| Trip title and narrow search prompt clipped                                                   | Wrapping trip title; single flex layout for search icon/input                                                                       | Inspected 320px image; measured placeholder fit without icon overlap                  |
| Desktop/tablet and phone controls lacked a consistent reading hierarchy                       | Inter across mobile body and controls; readable dock; two-column intermediate-width catalogue; separated photo rounding and credits | Four destinations at phone, tablet and desktop widths                                 |
| Saving or selecting a filter could lose keyboard focus                                        | Restore the opening action after rerender; keep custom choice focus; Escape and outside-pointer filter dismissal                    | Composed input, save-detail-close, region choice and dismissal browser assertions     |
| Japanese composition could be interrupted by result rendering                                 | Defer results until compositionend                                                                                                  | Synthetic composition events in Chromium and WebKit; physical keyboard remains manual |
| Empty Saved/Memories gave weak recovery or exposed irrelevant actions                         | Explain the next action; add direct exploration/memory action; enforce hidden print controls                                        | Inspected Saved, Memories and separate All places no-results views                    |
| Memory audience was below writing and photos while a generic sticky submit remained reachable | Put audience before writing; submit says Share with trip or Save privately; retain existing values and storage semantics            | Both audience captures; private creation and edit-value browser assertions            |
| Overview map labels collided and failure banner covered controls                              | Combine colliding regional overview groups; put recovery above map in normal flow                                                   | Loaded/failed/zoomed phone captures and marker intersection checks                    |
| Map markers declared a button role without working keyboard activation                        | Handle Enter/Space and focus the map after zoom                                                                                     | Actual keyboard zoom assertion; no fabricated map interaction                         |
| Expanded outing disclosures contained nested credit links                                     | Keep photo/credit beside disclosure; photo opens existing story; add missing region role to dice map                                | Axe expanded-state scan; phone/desktop credit captures; curated journey browser tests |
| Example handoff displayed deployment instructions                                             | Plain shared-app link and optional invitation-link form                                                                             | Dialog assertion and inspected handoff capture                                        |
| Controls/landmarks failed automated accessibility checks                                      | Label create action; repair heading order and duplicate landmarks; increase affected contrast                                       | Axe scans listed below                                                                |

## Observed verification

- The full 76-case Chromium/WebKit run passed 74 cases. The two failures expected
  the old private-save toast wording; the complete saving paths subsequently
  passed in both engines after updating the expectation.
- The final 26-case focused run covers quality, map, curated outings, discovery,
  shared friends and the multi-person trip simulation. It passed 25 cases; a
  WebKit state-fetch transport error passed in isolation (1/1). All five new
  quality cases pass in both engines, as do both multi-person trip simulations.
- An intermediate focused run caught a real missing keyboard handler and one
  incorrect new test label; those were corrected. It then stopped on local
  ENOSPC while starting WebKit workers. Browser temporary cleanup restored space;
  the final run is separate evidence, not a relabeled pass.
- Axe reported zero violations on four main routes at 393, 768 and 1440px, and
  on nine phone dialog/expanded states after the accessibility corrections.
  This is 21 sampled states, not WCAG certification or a complete assistive-
  technology audit.
- The fresh finish reviewer inspected 27 initial captures and the rejection
  image. Its three material findings were all scored resolved after seven
  valid recaptures. The later credit-link correction has separate inspected
  screenshots and automated accessibility evidence.
- Root checks, Sites compatibility, release source SHA and publication identity
  are recorded in `docs/audits/CURRENT_STATUS.md` in the integration repository.

## Remaining manual acceptance

Physical iPhone keyboard and Home Screen behavior, VoiceOver, real-provider
availability, travel feasibility and in-field use remain unverified. The
existing private-save, recommendation, optional RSVP and memory visibility
contracts are unchanged; screenshots alone do not establish those behaviors.
