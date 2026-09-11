---
name: Adventure Omakase Friends
description: A contemporary journey notebook with considered outings, playful local draws and precise invitations.
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
typography:
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
spacing:
  action-gap: '12px'
  field-gap: '18px'
  field-stack: '20px'
  panel: '24px'
  editorial-gap: '30px'
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
  selected-filter:
    backgroundColor: '{colors.green}'
    textColor: '{colors.white}'
    rounded: '{rounded.control}'
    padding: '8px 13px'
---

# Design System: Adventure Omakase Friends

## Overview

**Creative North Star: "Contemporary journey notebook"**

Warm paper, forest ink, editorial titles, flat reading surfaces and compact controls make travel information readable and actions immediate. The interface is calm and trustworthy before a decision and recedes during travel. A tactile die supplies a small moment of play within that same world.

This records the implemented friends browser app in this directory, using the current cascade in `public/app.css` and components in `public/app.js` and `public/outings.js`. The direction remains the accepted editorial brief and the contract in `public/index.html`; the future native application is a separate surface. Documentation of an implemented pattern is not evidence of production deployment or completed visual acceptance.

**Key Characteristics:**

- Continuous reading surfaces with separated entries.
- Editorial serif titles and practical sans-serif controls.
- Restrained color with explicit interaction states.
- Credited photographs, readable stories and a playable local draw.

## Colors

Warm paper and near-white surfaces support dark forest text and subdued secondary information. Token values in the frontmatter are normative.

### Primary

Forest green identifies main actions, selected filters, focus and active navigation. The deeper primary-hover tone distinguishes the main button's hover state. Primary actions use the pure-white action-text token, distinct from the near-white surface token.

### Secondary

Rust gives italic emphasis, timing and supporting cautions a warm accent. Blue and gold remain supporting metadata accents, without becoming competing primary actions.

### Neutral

Paper is the page canvas; near-white is the form and overlay surface. Ink carries primary text, muted carries secondary text, and line separates entries. Light green supports hover, selected options and the dice panel. Pale supplies warm supporting fields. Control-hover is the shared secondary-button hover fill.

**The State Clarity Rule.** Pair color with text, selection markers or underlines so the action or state remains explicit.

## Typography

Source Serif Display is self-hosted in regular and italic at weight 400, with Georgia as fallback. System sans-serif carries body copy, controls and form labels. Asset sources and licensing remain in `docs/PROVENANCE.md`.

The display role belongs to Explore's opening. Ordinary page titles use the page-title role; dialog headings use the headline role. Explore reduces to 32px at 850px and below, and ordinary page titles also reduce to 32px. Friends uses a 42px heading, reduced to 32px at 700px. These are intentional surface roles, not one universal h1 size.

Outing menu titles are 29px on desktop and 24px on mobile. Inline draw results use 34px, reducing to 29px. The invitation review title uses 38px, reducing to 31px. The editor's editable title is a serif input with a simple bottom rule, at 30px and 26px respectively. Supporting copy remains mostly 13–15px, with long introductory paragraphs limited to 62ch.

**The Task Scale Rule.** Keep forms compact: use sans-serif labels and readable controls beneath a restrained serif heading. Do not enlarge form labels into editorial headlines.

## Layout

The shared header caps its width at 1408px; the content container caps at 1360px. The compact trip-name header is used across the app, with a 76px desktop minimum height and 60px at 850px and below. The same four destinations—Explore, Your day, Friends and Memories—appear in desktop navigation and the mobile dock.

Explore places the regional selector above one inline dice surface and three considered outings. On desktop the dice surface has an introduction, a 210px visual column and an action column. Its revealed result spans the panel beneath those controls. The three outings use equal columns with 30px gaps and 215px-high photographs. At 850px and below, the die sits beside the introduction, actions wrap beneath it, and outing entries become 100px-image-and-text rows with 16px gaps. This is the current Explore composition, not a mandatory layout for every future surface.

The outing editor combines the visual stop list and live timeline; a separate invitation preview follows it. The review is constrained to 720px. On mobile its actions remain above the safe-area inset while the review reserves bottom space for them. Friends places the chosen day beside its heading on wide screens, then stacks them at 700px; invitations precede the expandable travel-window calendar. Memories use continuous entries with 36px gaps.

Preserve both the 850px navigation/Explore transition and the 700px compact-form/Friends transition. Some older content grids also adapt at 900px and 1100px; do not replace the existing cascade with an assumed universal breakpoint. Fields use 20px vertical spacing and 18px row gaps, reducing to 12px gaps in compact forms. Long labels and menu options wrap without widening the page.

## Elevation & Depth

Content surfaces are predominantly flat. Tonal shifts and fine dividers establish grouping. Floating selection menus use the overlay shadow (`0 18px 48px #192b2324`) to distinguish their layer; dialogs remain elevated over a backdrop. The die's perspective and cast shadow provide a contained physical affordance, not a new card-elevation system.

**The Reading Surface Rule.** Keep repeated entries on one continuous surface; reserve enclosing treatments for a meaningful control, overlay or emphasized supporting panel.

## Shapes

Controls have gently curved corners using the control token. Emphasized supporting panels use the surface token; selection menus and their options use the menu and option tokens. Ordinary reading rows, itinerary stops and memories use square, unboxed geometry. Photographs follow their surface: the outing menu uses square crops, while some discovery photographs retain subtle rounding. Circular avatars remain appropriate for people.

## Components

### Buttons and fields

Buttons use compact sans-serif text, a minimum 44px height and a fine border. Primary actions use green with white text; secondary buttons use near-white with ink, and subtle buttons use transparent backgrounds. Hover changes fill and border without shifting layout. Disabled buttons reduce opacity and suppress the pointer affordance. Preserve inherited exceptions as exceptions, rather than turning undersized legacy controls into the new standard.

Fields use persistent labels, near-white fill, a restrained border and a minimum 46px height. Focusable controls receive a green 2px outline offset by 3px. Textareas remain vertically resizable. File selectors follow the shared control treatment. Compact form inputs and the mobile review's meeting-point inputs use 16px text.

Selection controls progressively enhance a native select. One top-layer menu supplies selected weight and a check mark while the native element remains the submitted value. Preserve keyboard navigation, typeahead, focus restoration, linked option updates and the native fallback. Control transitions use 180ms with the shared easing; menu entry uses 160ms. Reduced-motion preferences suppress these animations.

### Navigation and filters

Desktop navigation marks the active destination with a green underline and gives inactive items a tonal hover. The mobile dock carries the same destinations and paper surface. Regional tabs use a visible underline and selected weight; filter chips use green fill and near-white text. Secondary travel tools, the full fieldbook and settings stay findable without enlarging the primary shell.

### Outing menu and inline dice

Three sourced outings belong to each selected region. Each entry combines a photograph, duration estimate, serif title, plain-language pitch and fit. Image and title open the story; credits remain separate readable links. The full catalogue remains reachable below this considered menu.

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

- **Do** keep labels visible and interaction states explicit.
- **Do** preserve native form values and keyboard behavior when styling selection controls.
- **Do** keep photo credits, reference-image labels and planning uncertainty beside the content they qualify.
- **Do** preserve the distinction between reading, editing, reviewing and publishing an invitation.
- **Do** make private and trip-shared memory choices explicit.

### Don't:

- **Don't** turn repeated content into a wall of rounded cards.
- **Don't** introduce casino mechanics, neon gaming or a kawaii mascot direction.
- **Don't** inherit legacy decorative eyebrows, text-glyph icons or tiny metadata as rules for new surfaces.
- **Don't** turn declared regional overlap into a proximity or availability claim.
