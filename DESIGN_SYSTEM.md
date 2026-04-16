# Design System

`Movie Discovery` uses a lightweight `Cinematic Material` design system. This document is the working contract for shared tokens, shared components, and governance rules.

## Goals

- Keep new UI consistent with the existing cinematic visual language.
- Make shared components the default path for new product work.
- Keep accessibility, i18n, and responsive behavior built into the shared layer.

## Foundation Tokens

The source of truth for foundation tokens is `movie-discovery/src/styles.scss`.

### Token groups

- `color`: `--bg`, `--bg-elevated`, `--bg-muted`, `--text`, `--text-muted`, `--accent`, `--accent-secondary`, `--link`
- `spacing`: `--space-1` to `--space-6`
- `radius`: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
- `shadow`: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-card`
- `motion`: `--duration-fast`, `--duration-normal`, `--ease-out`
- `focus`: `--focus-ring`, `--focus-offset`
- `type`: `--font-size-caption`, `--font-size-body`, `--font-size-title-sm`, `--font-size-title-md`
- `touch`: `--touch-target-min`

### Token rules

- New shared components must use tokens before introducing raw values.
- New tokens are allowed only when an existing token cannot express the pattern cleanly.
- Token additions must work with both default theme and `Looks`.
- Touch targets should not go below `--touch-target-min` unless the pattern is purely decorative.

## Shared Component Core

These are the first-level shared components that new screens should prefer:

- `Button`
- `EmptyState`
- `FormField`
- `Section`
- `MovieCard`
- `BottomSheet`
- `SegmentedControl`
- `ToastViewport`
- `ErrorBanner`

## Component Passports

### `Button`

- Purpose: primary and secondary call-to-action surface
- Variants: `primary`, `secondary`, `ghost`, `danger`, `icon`
- Sizes: `sm`, `md`, `lg`
- A11y contract: uses semantic `<button>`, exposes `aria-busy`, respects disabled state
- Do: use for clickable actions that submit, confirm, dismiss, or navigate through explicit handlers
- Do not: restyle raw buttons locally when `Button` can already express the state

### `EmptyState`

- Purpose: consistent empty, onboarding, and zero-data block
- States: title, optional subtitle, optional action slot
- A11y contract: readable copy, actions remain keyboard reachable, wraps safely on mobile
- Do: use when the main content area has no items yet
- Do not: replace with loose muted `<p>` placeholders on product screens

### `FormField`

- Purpose: standard field wrapper for label, control, hint, and error
- States: default, hint, error
- A11y contract: keeps label + control grouping, error uses `role="alert"`
- Do: place `input`, `select`, or `textarea` inside the control slot
- Do not: duplicate field chrome inline on pages without a clear reason

### `Section`

- Purpose: page block with stable heading and optional actions slot
- States: title only, title + actions, body content
- A11y contract: keeps heading hierarchy predictable
- Do: use for page-level grouping on feature screens
- Do not: create custom section headers for a pattern that already matches this shape

## Governance Rules

- New pages should be assembled from shared components first.
- Local components are acceptable only if the interaction pattern is genuinely new.
- Any change to a shared component must be checked in at least 2 real usage contexts or a focused component test.
- Shared component API changes should stay additive when possible.
- Avoid raw one-off colors, spacing, shadows, and focus styles in feature pages when a token exists.

## Review Checklist

- Does this change reuse an existing shared component?
- If not, is the pattern actually new?
- Are raw visual values avoidable with existing tokens?
- Does the component work with keyboard, screen readers, and i18n text growth?
- Was the shared change verified with a component test or on multiple screens?

## Current Implementation Baseline

This feature wave standardizes:

- spacing, type, and touch target tokens in `styles.scss`
- `Button` size/variant contract
- token usage in `EmptyState`, `FormField`, and `Section`

Further shared components should follow the same contract style.
