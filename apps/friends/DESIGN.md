---
name: Adventure Omakase Friends
description: A contemporary journey notebook with precise, compact travel controls.
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
typography:
  display:
    fontFamily: "'Source Serif Display', Georgia, serif"
    fontSize: '52px'
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: '-0.025em'
  headline:
    fontFamily: "'Source Serif Display', Georgia, serif"
    fontSize: '34px'
    fontWeight: 400
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '15px'
    lineHeight: 1.65
  label:
    fontSize: '13px'
    fontWeight: 600
    lineHeight: 1.5
rounded:
  surface: '12px'
  control: '6px'
components:
  button-primary:
    backgroundColor: '{colors.green}'
    textColor: 'white'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  button-secondary:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 17px'
  field:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 12px'
---

# Design System: Adventure Omakase Friends

## Overview

**Creative North Star: "Contemporary journey notebook"**

Warm paper, forest ink, editorial titles, flat reading surfaces and compact controls make travel information readable and actions immediate. The interface is calm and trustworthy before a decision and recedes during travel.

This records the implemented friends app, scoped to this directory. The direction comes from the accepted product brief and the contract in `public/index.html`; values come from the final cascade in `public/app.css`. It does not prescribe the future native application. The bounded browser review is recorded in `docs/design-review-2026-09-06.md`.

**Key Characteristics:**

- Continuous reading surfaces with separated entries.
- Editorial serif titles and practical sans-serif controls.
- Restrained color with explicit interaction states.

## Colors

Paper and near-white surfaces support dark forest text and subdued secondary information.

Primary green identifies main actions, selected filters, focus and active navigation. Light green supports hover and selected-option backgrounds. Rust provides a secondary action and warning accent; blue and gold remain supporting metadata accents. Pale provides warm supporting fields. Ink carries primary text, muted carries secondary text, and line separates content.

**The State Clarity Rule.** Pair color with text, selection markers or underlines so the action or state remains explicit.

## Typography

Source Serif Display is self-hosted in regular and italic at weight 400, with Georgia as fallback. System sans-serif carries body copy, controls and form labels. Asset sources and licensing are in `docs/PROVENANCE.md`.

Page titles use the display role; section and dialog headings use the headline scale. At narrow widths, page titles reduce to 40px, section headings to 29px and dialog headings to 30px. Smaller content titles generally sit between 25px and 28px. Supporting paragraphs commonly use 14px. Introductory copy is constrained to 62ch.

**The Task Scale Rule.** Keep forms compact: use sans-serif labels and readable controls beneath a restrained serif heading. Do not enlarge form labels into editorial headlines.

## Layout

The desktop header is capped at 1408px with horizontal padding. Content uses a broad centered reading surface, with columns where related content benefits from comparison. Separators organize discovery, invitation and memory entries without boxing each paragraph.

The principal redesigned mobile transition is 700px: discovery becomes a single column, decorative introductory artwork hides, field text becomes 16px and dialog padding contracts. The existing navigation also changes at 850px; its dock carries the same paper background. Preserve both responsive layers when extending this app rather than assuming one universal breakpoint.

Forms use 20px field spacing and 18px row gaps, reduced to 12px gaps on narrow screens. Actions wrap. Discovery's secondary filters expand on request, and mood choices can scroll horizontally. Long text must wrap inside fields and menus without widening the page.

## Elevation & Depth

Content surfaces are predominantly flat. Tonal shifts and fine dividers establish grouping. Floating selection menus use the shared soft shadow to distinguish their layer; dialogs remain elevated over a backdrop. Do not remove useful overlay depth merely because content rows are flat.

**The Reading Surface Rule.** Keep repeated entries on one continuous surface; reserve enclosing treatments for a meaningful control, overlay or emphasized supporting panel.

## Shapes

Controls have gently curved corners using the control token. Emphasized supporting panels use the surface token. Ordinary reading rows and memories use square, unboxed geometry; photographs may retain subtle rounding. Circular avatars remain appropriate for people. This is a mixed functional shape vocabulary, not a universal radius applied to every element.

## Components

Buttons use compact sans-serif text, a minimum 44px height and a fine border. Primary actions use green with white text; secondary buttons use near-white with ink, and subtle actions use transparent backgrounds. Hover changes fill and border rather than shifting layout. Disabled buttons reduce opacity and suppress the pointer affordance.

Fields use persistent labels, near-white fill, a restrained border and a minimum 46px height. Focusable controls receive a green 2px outline offset by 3px. Textareas remain vertically resizable. File selectors follow the shared control treatment.

Selection controls progressively enhance a native select. A single top-layer menu supplies the visible choices, selected weight and check mark; the native element remains the submitted value. Preserve keyboard navigation, typeahead, focus restoration and linked option updates. Without popover support, native selection remains available. Menu entry motion is brief and is disabled under reduced-motion preferences.

Navigation uses a green underline for the active desktop item and a tonal hover for inactive items. Selected filter buttons use green fill and near-white text. Filters are controls; compact status labels are supporting information, not competing calls to action.

Content rows use spacing and separators. Hover on actionable rows may add light green; read-only prose should not acquire a button affordance. Discovery artwork remains labeled illustration, with origin metadata; it is not evidence of a real venue's current appearance.

Booking import is an optional disclosure inside the profile form, open for a new traveller and collapsed when dates already exist. Show the selected source beside readable local dates and a specific uncertainty prompt. Applying a suggestion stages editable fields; the ordinary Save action commits them. Unknown arrival or departure stays visibly open, and later bookings preserve unrelated dates and personal details.

## Do's and Don'ts

- **Do** keep labels visible and interaction states explicit.
- **Do** preserve native form values and keyboard behavior when styling selection controls.
- **Do** use supplied illustrations with truthful provenance and distinct treatment from shared memory photographs.
- **Don't** turn repeated content into a wall of rounded cards.
- **Don't** introduce casino mechanics, neon gaming or a kawaii mascot direction.
- **Don't** inherit legacy decorative eyebrows or text-glyph icons as rules for new surfaces; those exceptions are not part of the recorded system.

## Interactive travel surfaces

The home introduction is a compact welcome and next-plan row. Invitation detail places joining or host editing/sharing above secondary logistics. Effort, cost and booking information remain readable without separate enclosing cards. The editor leads with essential fields; additional descriptions, participation rules and logistics stay in a disclosure with their values preserved. Native validation opens a collapsed group when a field needs attention.

Calendar replaces the primary file-download journey. A Monday-first date grid exposes personal hosted/joined plans or all shared invitations; desktop cells preview plan titles, while small screens retain counts and the selected-day agenda. Personal entries preserve the selected part's time and changed/cancelled state. The People date strip is keyboard-operable and leads to shared areas, existing invitations and a date/region-prefilled invitation. Shared stretches describe declared regional overlap, never proximity or availability.

Discovery previews use the labelled eight-theme illustration atlas under `public/assets/discovery/`. The cube roll is the deliberate motion moment: a six-face CSS die tumbles for 1.15 seconds before revealing a local catalogue result. Reduced motion skips the tumble. Matching counts appear before rolling; exhausting a shortlist begins an explicitly labelled new round, and empty filters offer specific one-click alternative shortlists. Water, booking, excursion and event-date restrictions are never silently relaxed.

## Discovery context and booking intent

Discover puts mood entrances and the Saved shelf before catalogue results. Saving is a private shortlist action with visible feedback and a direct destination. Genuine, attributed location photographs replace the repeated mood atlas; entries without verified images stay text-led. Photo dates and linked credit/license remain visible. Source-derived experience prose carries into invitations while host-authored notes stay distinct.

Maps load inline on explicit request, describe a search rather than a verified pin, and offer a normal external Maps link. Vague host text produces an area view. A friendly trip-day picker leads date entry; native exact date entry sits inside it. Start presets and duration buttons populate editable native time fields, with Japan time explicit and no silent next-day rollover. Host completion/cancellation use normal padded controls and stack on narrow screens. Palette changes await the user's inspiration images.
