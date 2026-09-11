---
name: Adventure Omakase Friends
description: Searchable places and precise invitations, with clean mobile surfaces and a paper desktop journal.
colors:
  paper: '#f7f5ef'
  white: '#fffefa'
  ink: '#26352e'
  muted: '#61685f'
  line: '#d6d9ce'
  green: '#244b3b'
  lightgreen: '#e8eee5'
  rust: '#93472f'
  pale: '#f1e6d8'
  blue: '#476a76'
  gold: '#b59559'
  action-text: 'white'
  primary-hover: '#375c45'
  control-hover: '#eff0e7'
  mobile-paper: '#ffffff'
  mobile-white: '#ffffff'
  mobile-ink: '#18191b'
  mobile-muted: '#62616a'
  mobile-line: '#e5e4ea'
  mobile-green: '#202024'
  mobile-lightgreen: '#f1eff6'
  mobile-pale: '#f6f4f8'
typography:
  places-display:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: 'clamp(26px, 3vw, 38px)'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.035em'
  mobile-places-display:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '27px'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.035em'
  place-title:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '30px'
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: '-0.035em'
  mobile-place-title:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '28px'
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: '-0.035em'
  place-card-title:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '20px'
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: '-0.025em'
  mobile-place-card-title:
    fontFamily: "'Inter Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '22px'
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: '-0.025em'
  display:
    fontFamily: "'Source Serif Display', Georgia, serif"
    fontSize: '52px'
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: '-0.025em'
  page-title:
    fontFamily: "'Source Serif Display', Georgia, serif"
    fontSize: '40px'
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: '-0.025em'
  headline:
    fontFamily: "'Source Serif Display', Georgia, serif"
    fontSize: '34px'
    fontWeight: 400
    lineHeight: 1.15
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '15px'
    lineHeight: 1.65
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '13px'
    fontWeight: 600
    lineHeight: 1.5
rounded:
  surface: '12px'
  control: '6px'
  menu: '8px'
  option: '4px'
  mobile-control: '12px'
  photo: '14px'
  floating-panel: '16px'
  pill: '24px'
  search: '28px'
  sheet: '24px 24px 0 0'
  circle: '50%'
spacing:
  action-gap: '12px'
  field-gap: '18px'
  field-stack: '20px'
  panel: '24px'
  editorial-gap: '30px'
  mobile-gutter: '18px'
  mobile-sheet-gutter: '20px'
  place-list-gap: '26px'
  quick-action-gap: '8px'
components:
  button-primary:
    backgroundColor: '{colors.green}'
    textColor: '{colors.action-text}'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.action-text}'
  button-secondary:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  button-subtle:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  button-rust:
    backgroundColor: '{colors.rust}'
    textColor: '{colors.action-text}'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  button-danger:
    backgroundColor: '{colors.white}'
    textColor: '#9c392d'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  field:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 12px'
  mobile-button-primary:
    backgroundColor: '{colors.mobile-green}'
    textColor: '{colors.action-text}'
    rounded: '{rounded.mobile-control}'
    padding: '10px 17px'
  mobile-search:
    backgroundColor: '{colors.mobile-lightgreen}'
    textColor: '{colors.mobile-ink}'
    rounded: '{rounded.search}'
    padding: '0 15px'
    height: '48px'
  place-quick-action:
    backgroundColor: '{colors.lightgreen}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: '8px 13px'
  place-bookmark:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.circle}'
    width: '44px'
    height: '44px'
  mobile-place-sheet:
    backgroundColor: '{colors.mobile-white}'
    textColor: '{colors.mobile-ink}'
    rounded: '{rounded.sheet}'
    width: '100%'
  mobile-place-action:
    backgroundColor: '{colors.mobile-green}'
    textColor: '{colors.action-text}'
    rounded: '{rounded.search}'
    padding: '9px 14px'
  place-section:
    textColor: '{colors.ink}'
    padding: '18px 0'
  selected-filter:
    backgroundColor: '{colors.green}'
    textColor: '{colors.white}'
    rounded: '{rounded.control}'
    padding: '8px 13px'
---

# Design System: Adventure Omakase Friends

## Overview

**Creative North Star: "Contemporary journey notebook"**

The contemporary journey notebook now has a clean mobile expression: white surfaces, near-black actions, pale lavender controls and compact place photography. Desktop retains warm paper and forest ink. Clear titles, continuous reading surfaces and explicit actions keep the interface calm before a decision and let it recede during travel; dice remain a contained moment of play inside an expandable outing choice.

This records the implemented friends browser app in this directory, using the current cascade in `public/app.css` and components in `public/app.js` and `public/outings.js`. The accepted Corner-led mobile adaptation and current discovery hierarchy are recorded in `docs/CORNER_MOBILE_RESEARCH.md` and `PRODUCT.md`. The future native application is a separate surface. This document records the current source, not a new product specification. Documentation of an implemented pattern is not evidence of production deployment or completed visual acceptance.

**Key Characteristics:**

- Continuous reading surfaces with separated entries.
- Self-hosted Inter Display on place headings; editorial serif titles on other desktop surfaces.
- White mobile surfaces, near-black actions and pale lavender secondary controls.
- Restrained color with explicit interaction states.
- Credited photographs, readable stories and a playable local draw.

## Colors

The unprefixed palette is the desktop default. At 850px and below, mobile-prefixed tokens override the corresponding CSS properties globally: paper, white, ink, muted, line, green, lightgreen and pale. The names of the original CSS properties remain unchanged, so `green` becomes the near-black action role and `lightgreen` becomes lavender on phones. Token values in the frontmatter are normative.

### Primary

Forest green on desktop and near-black on mobile identify main actions, selected filters and focus. Desktop active navigation uses an underline; the mobile dock uses a lavender active fill and ink text. The deeper primary-hover tone distinguishes the main button's hover state. Primary actions use the pure-white action-text token, distinct from the near-white surface token.

### Secondary

Rust gives italic emphasis, timing and supporting cautions a warm accent. Blue and gold remain supporting metadata accents, without becoming competing primary actions.

### Neutral

Paper is the page canvas; near-white is the form and overlay surface. Ink carries primary text, muted carries secondary text, and line separates entries. Light green supports hover, selected options and the dice panel. Pale supplies warm supporting fields. Control-hover is the shared secondary-button hover fill. Rust, blue, gold and the literal primary/control hover colors are not remapped by the mobile override; preserve that distinction when extracting the cascade.

**The State Clarity Rule.** Pair color with text, selection markers or underlines so the action or state remains explicit.

## Typography

Inter 4.1 is self-hosted as the variable `Inter Display` face (weights 100–900, normal, `font-display: swap`) from `/assets/fonts/inter-variable.woff2`, with optical sizing enabled. It is used for the searchable places heading, place card titles and place sheet title on both desktop and mobile. The display heading reduces to the mobile-places-display role; the card and sheet use their corresponding mobile roles. Inter uses the SIL Open Font License; provenance is recorded with the reference research and font assets.

Source Serif Display remains self-hosted in regular and italic at weight 400, with Georgia as fallback. System sans-serif carries body copy, controls and form labels. At 850px and below the `--serif` property resolves to the system sans-serif stack throughout the app; Inter is not a global body-font replacement. Existing asset sources and licensing remain in `docs/PROVENANCE.md`.

The older display role now belongs to the expanded outing introduction, not the initial places heading. Ordinary page titles use the page-title role and reduce to 32px on mobile. Dialog headings retain their headline role unless a task surface overrides it. Friends uses 42px, reduced to 32px at 700px. Outing menu titles are 29px on desktop and 24px on mobile; inline draw results use 34px and 29px. Invitation review uses 38px and 31px. The editable outing title uses 30px and 26px. These legacy roles use serif on desktop and system sans-serif on mobile.

Place summaries use 15px/1.55. Card summaries use 14px/1.45 and a two-line clamp; the sheet supplies fuller reading. Search inputs use 16px on mobile. Supporting text is mostly 12–15px; photo credits use 10px in the place components and remain separate readable links. Do not generalize smaller inherited outing-photo credits into a new body-text scale.

**The Task Scale Rule.** Keep forms compact: use sans-serif labels and readable controls beneath a restrained task heading. Do not enlarge form labels into editorial headlines.

## Layout

The shared header caps its width at 1408px; the content container caps at 1360px. The compact trip-name header is used across the app, with a 76px desktop minimum height and 60px at 850px and below. The same four destinations—Explore, Your day, Friends and Memories—appear in desktop navigation and the mobile dock.

Explore opens on searchable places: heading, persistent search and map/list controls, horizontally scrollable regional chips on mobile, All discoveries/Saved scope, and expandable area, mood and time filters. The full fieldbook is the initial list. “Let Omakase choose” expands dice and curated outings when the list has no search, saved scope, area, mood or time restriction; a chosen region does not hide it. The disclosure is absent in map view. Searchable places remain the primary composition on desktop as well.

The places list retains the existing three-column desktop grid and intermediate responsive grid behavior. At 850px and below it becomes one column with 26px between entries and 18px side gutters. The mobile toolbar keeps a flexible search field beside two 44px icon buttons with accessible labels; it does not stack the map/list switch under search. Card photographs are 210px high on desktop and 220px on mobile. Filter content floats below its summary, at up to 430px wide within the available parent width.

Mobile map view runs edge to edge within the places container, with height `clamp(300px, 49svh, 560px)` and a 300px minimum. A selected-place summary appears beneath the map on a tinted surface; its photograph is hidden there. The map feedback overlay wraps on phones and provides an explicit action. Map and list selection retain place and area context.

A mobile place sheet fills the viewport below a 12px top gap, using the measured phone viewport height with `100dvh` fallback. Its top corners use the sheet radius, its body has 20px side gutters, and its invitation action stays sticky at the bottom with safe-area padding. Desktop sheets retain 24px body gutters. A multi-photo gallery uses horizontal scroll snapping, 10px gaps and 88%-width figures; single photos retain the same hierarchy.

Inside the expanded outing choice, the desktop dice surface has an introduction, a 210px visual column and an action column; the result spans beneath them. Three regional outings use equal columns with 30px gaps and 215px-high photos. On mobile the die sits beside its introduction, actions wrap beneath it and outings become 100px-image-and-text rows with 16px gaps. This is an optional discovery path, not the homepage's leading content.

The outing editor combines the visual stop list and live timeline; a separate invitation preview follows it. The review is constrained to 720px. On mobile its actions remain above the safe-area inset while the review reserves bottom space for them. Friends places the chosen day beside its heading on wide screens, then stacks them at 700px; invitations precede the expandable travel-window calendar. Memories use continuous entries with 36px gaps.

Preserve both the 850px mobile-theme/navigation transition and the 700px compact-form/Friends transition. Some older content grids also adapt at 900px and 1100px; do not replace the existing cascade with an assumed universal breakpoint. Fields use 20px vertical spacing and 18px row gaps, reducing to 12px gaps in compact forms. Long labels and menu options wrap without widening the page.

## Elevation & Depth

Content surfaces are predominantly flat. Tonal shifts and fine dividers establish grouping. Floating selection menus use the overlay shadow (`0 18px 48px #192b2324`); the places filter panel uses `0 12px 40px #14182026`, photo save controls use `0 3px 12px #15191b20`, and map feedback uses `0 4px 20px #18191b24`. These distinguish floating controls rather than enclosing every place in an elevated card. Dialogs remain elevated over a backdrop. The die's perspective and cast shadow provide a contained physical affordance, not a new card-elevation system.

**The Reading Surface Rule.** Keep repeated entries on one continuous surface; reserve enclosing treatments for a meaningful control, overlay or emphasized supporting panel.

## Shapes

Shared controls use the desktop control radius and the larger mobile-control override. Place photos and the sheet's save button use the photo radius; floating filters and selected-map summaries use floating-panel rounding. Search and the sticky invitation action use the search radius, while quick actions and region chips use the pill radius. Save controls over photos and sheet close buttons are circular. The mobile sheet rounds only its upper corners.

Ordinary place cards, reading rows, itinerary stops and memories remain unboxed. Rounded photographs do not imply a rounded card container. Expanded outing-menu photos retain their existing square crops. Circular avatars remain appropriate for people.

## Components

### Buttons and fields

Buttons use compact sans-serif text, a minimum 44px height and a fine border. Primary actions use the viewport-specific action role with white text; secondary buttons use the viewport-specific white surface with ink, and subtle buttons use transparent backgrounds. Hover changes fill and border without shifting layout. Disabled buttons reduce opacity and suppress the pointer affordance. Preserve inherited exceptions as exceptions, rather than turning undersized legacy controls into the new standard.

Fields use persistent labels, near-white fill, a restrained border and a minimum 46px height. Focusable controls receive a 2px outline in the viewport-specific action role offset by 3px. Textareas remain vertically resizable. File selectors follow the shared control treatment. Compact form inputs and the mobile review's meeting-point inputs use 16px text.

Selection controls progressively enhance a native select. One top-layer menu supplies selected weight and a check mark while the native element remains the submitted value. Preserve keyboard navigation, typeahead, focus restoration, linked option updates and the native fallback. Control transitions use 180ms with the shared easing; menu entry uses 160ms. Reduced-motion preferences suppress these animations.

### Navigation and filters

Desktop navigation marks the active destination with a green underline and gives inactive items a tonal hover. The mobile dock carries the same four destinations on white, with lavender fill and ink text for the active item. Main regional filter chips use the action fill for selection; mobile chips scroll horizontally. The expanded outing chooser retains its separate underlined region tabs. All discoveries and Saved remain beside the Filters disclosure, with the saved count and explicit private-shortlist copy. Selected state must remain readable through labels and pressed/current semantics, including icon-only map/list buttons. Travel tools and settings remain secondary actions in the shared footer, including filtered and map views.

### Place cards, saved state and detail sheets

Photo-led cards combine a rounded image, independently linked credit, area/category, Inter Display title, compact summary, time-on-site estimate and available social context. A 44px circular bookmark overlays the image. Entries without photography use a divider and a separate save control rather than fabricated imagery. Saving is private; the explicit recommendation action is a separate trip-visible choice. Neither state implies a visit, RSVP or booking.

The sheet leads with title, category and a labelled Save/Saved control, followed by credited photography and a short summary. Compact Map, Maps search and Source actions sit in a wrapping row. No embedded map is inserted automatically into every sheet. Time on site excludes travel. Actual friend recommendations and open invitations appear when present; empty social proof is not invented.

Three independent disclosures contain the experience guide, Before you go, and Research & sources. Their divided summaries use a plus that rotates when open. Water, separate-stay and event-window warnings remain outside those disclosures; advance arrangements remain in the visible estimate. Source scope, dates and uncertainty remain accessible, and later checked-source results append within Research & sources.

A single sticky “Invite friends to this” action has a 48px minimum height and a short day/meeting-point prompt beside it. It starts an editable plan; it does not publish. Mobile action text is 13px with 9px 14px padding, and the bar reserves the safe-area inset. The sheet enters with an 18px vertical translation over 180ms only when motion is permitted.

### Outing menu and inline dice

Three sourced outings belong to each selected region. Each entry combines a photograph, duration estimate, serif title, plain-language pitch and fit. Image and title open the story; credits remain separate readable links. This considered menu lives in the expandable choice section; the searchable catalogue remains the primary discovery surface.

The inline die rolls with touch or keyboard and works without a map. Time and mood refinements sit in a disclosure; a full chooser handles other areas and more detailed limits. The result appears in the same panel with a photograph when available, description, one highlight, time on site, practical-source disclosure, a closer-look action and a personal save action. Repeat rolls keep a previous-result action. If an image depicts only the neighbourhood, its reference label must remain explicit. Empty shortlists explain the limits and do not invent an experience or silently widen the search.

The die is the deliberate motion moment. Preserve its reduced-motion path and result focus announcement. Water, booking, excursion and event-date restrictions remain visible and must never be silently relaxed. A neighbourhood match does not establish walking distance or route feasibility.

### Story, editor and invitation review

Stories lead with the outing itself and ordinary reading sections for experience, practical context and sources. Story duration and the starting draft both derive from the same included stops and editable travel allowances; time on site and travel are distinct. These are planning estimates, not checked opening hours or a verified route.

One visual editor provides title, Japan date and time, photo-supported stop selection, duration, order, travel allowances and a live timeline. Optional spending, notes and fallback fields remain editable. Review then presents the invitation as friends will read it, with start/end times, selected stops and exact meeting points. Missing meeting points can be supplied there; changing the outing returns to the same editor. The explicit publish action is the sharing boundary.

Invitation detail leads with time, host, effort, cost, booking and joining. Friends may join all or one offered stop. Source context and host-authored notes stay distinct; booking, water and separate-stay cautions remain readable. Calendars and personal agendas retain selected-part times and changed/cancelled states.

### Friends and Memories

Friends opens on the selected day and the invitations it contains. Shared regional travel windows follow as supporting context, with the broader calendar expandable. Declared regional overlap never implies proximity, availability or attendance.

Memories are voluntary photo-and-prose entries on a continuous surface. A visible sharing control distinguishes a trip-shared page from an Only me page; badges repeat that state beside saved entries. The shared book includes only author-shared memories. A personal edition may include the author's private entries and must remain visibly identified as personal. Completing an invitation never invents attendance or a memory.

### Sources, maps and companion forms

Use genuine, attributed location photographs where available. Keep historical dates, linked credit and licence visible; dish and neighbourhood references must not imply current venue evidence. Supplied illustrations remain labelled illustration with their origin metadata. Source-derived experience prose stays separate from host-authored notes.

The geographic catalogue map connects regional Japan to neighbourhood areas with explicit broad anchors and unlocated entries, a keyboard area chooser and visible attribution. Meeting maps describe search or area context rather than verified pins. Journey links request a starting point in Maps; travel duration is never fabricated.

Booking import remains an optional profile disclosure, open for a new traveller and collapsed when dates already exist. Selected source, local dates and uncertainty stay readable. Applying a suggestion stages editable fields; Save commits them. Unknown dates remain visibly open and later bookings preserve unrelated dates and personal details.

## Do's and Don'ts

### Do:

- **Do** keep labels visible and interaction states explicit, including names for icon-only map/list controls.
- **Do** apply the mobile palette only at 850px and below and preserve desktop paper colors.
- **Do** keep private saves, recommendations and invitations separate in both copy and controls.
- **Do** preserve native form values and keyboard behavior when styling selection controls.
- **Do** keep photo credits, reference-image labels and planning uncertainty beside the content they qualify.
- **Do** preserve the distinction between reading, editing, reviewing and publishing an invitation.
- **Do** make private and trip-shared memory choices explicit.

### Don't:

- **Don't** turn repeated content into a wall of rounded cards.
- **Don't** introduce casino mechanics, neon gaming or a kawaii mascot direction.
- **Don't** inherit legacy decorative eyebrows, text-glyph icons or tiny metadata as rules for new surfaces.
- **Don't** turn declared regional overlap into a proximity or availability claim.
