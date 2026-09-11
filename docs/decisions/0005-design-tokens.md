# ADR 0005: Platform-neutral warm editorial design semantics

Status: Accepted (amended 2026-08-23)

## Context

The canonical plan defines a quiet Japanese editorial system using paper, ink, brass, vermilion and moss, with restrained surfaces, fine borders and accessible platform-native rendering.

## Decision

Store semantic color, spacing, radii, typography, elevation and motion values in `packages/design-tokens`. Use the approved blueprint as the semantic source:

- paper backgrounds and surfaces
- ink text and primary action
- brass ritual/fate emphasis
- vermilion warning or rare emphasis
- moss verified/success state
- subtle borders and limited elevation

Provide platform adapters instead of sharing web CSS or React components. Native and web component systems may diverge in implementation while retaining semantic parity.

## Consequences

Studio and mobile share visual intent without coupling their rendering primitives. Future components can implement dynamic type, reduced motion, high contrast and offline/error states idiomatically.

## Rejected alternatives

A universal cross-platform component library was rejected as premature. Independent color systems would drift. The bootstrap's earlier generic green palette was superseded because the full approved design source is present.
