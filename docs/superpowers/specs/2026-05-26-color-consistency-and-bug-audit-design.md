# Color consistency cleanup + project-wide UI bug audit

**Date:** 2026-05-26
**Scope:** Three named consistency fixes, accent-vs-brand-red audit cleanup, and a Playwright-driven UI bug sweep across the site.

## Background

The site uses two color tokens that look similar but mean different things:

- `--m-red` (`#e51400`) — the fixed Metro brand red. Used for true brand identity (logo seal, Metro 404 tile, sealed-badge semantics).
- `--accent` — user-themeable (cobalt / red / orange / emerald), set via the accent swatches in the locale drawer.

Several interactive affordances are still pinned to `--m-red` when they should follow the user-selected `--accent`. This violates Windows 10 Mobile's core personalization principle: accent color propagates through all interactive states (links, current-selected indicators, focus rings).

## Goals

1. Migrate interactive/state colors from `--m-red` to `--accent` while preserving brand-identity reds.
2. Fix HubPivot prev/next chevrons on mobile so they meet WP10 touch-target guidance (≥44 px) without adopting non-WP10 visual button affordances.
3. Establish a baseline UI audit (desktop + mobile) and produce a triaged punch list of remaining bugs.

## Non-goals

- Re-theming or changing the accent palette options.
- Replacing the Hub Pivot pattern with a different navigation model.
- Refactoring `BaseLayout.astro` structure beyond the targeted color edits.
- Fixing bugs surfaced by the audit — the audit *produces* a punch list; fixes are negotiated case-by-case after the list is in hand.

## Design — Part 1: Three named fixes

### A. Search input focus border

[site/src/pages/[locale]/search.astro:121](../../site/src/pages/[locale]/search.astro)

```diff
- .search-input:focus { border-color: var(--m-red); background: var(--t-ink); color: #fff; }
+ .search-input:focus { border-color: var(--accent); background: var(--t-ink); color: #fff; }
```

Rationale: focus ring is an interaction-state affordance, not brand identity.

### B. Footer left vertical stripe

[site/src/layouts/BaseLayout.astro:936](../../site/src/layouts/BaseLayout.astro)

```diff
  footer::before {
    content: '';
    position: absolute;
    left: 1.5rem; top: 1.75rem; bottom: 2rem;
    width: 3px;
-   background: var(--m-red);
+   background: var(--accent);
  }
```

Rationale: the WP10 footer stripe is a personalized chrome accent, not a Logo element.

### C. HubPivot mobile prev/next chevrons

[site/src/components/HubPivot.astro:84-87](../../site/src/components/HubPivot.astro)

Problem (current state on mobile):
- `.hub-pivot-link` has `padding: 0` → tap target = literal glyph size, well below the ≥44 px WP10 touch-target guideline.
- Container side padding `var(--sp-4)` puts the chevrons within ~16 px of the viewport edge — they read as "stuck to the edge."
- The Unicode `‹` `›` glyphs at `var(--fs-title)` look thin.

Fix (mobile breakpoint only, ≤540 px):

```diff
  @media (max-width: 540px) {
-   .hub-pivot { min-height: 3.5rem; padding: var(--sp-3) var(--sp-4) var(--sp-1); }
+   .hub-pivot {
+     min-height: 3.5rem;
+     padding: var(--sp-3) var(--sp-4) var(--sp-1);
+     gap: var(--sp-3);
+   }
+   .hub-pivot-link {
+     padding: var(--sp-3) var(--sp-2);
+     min-width: 44px;
+     min-height: 44px;
+     justify-content: center;
+   }
+   .hub-pivot-arrow {
+     font-size: var(--fs-h2);
+   }
    .hub-pivot-peek { display: none; }
  }
```

WP10 design principle observed: chevrons stay chrome-less (no background, no border, no rounded button look), keeping `font-weight: var(--fw-light)` typography. The 44×44 tap area is achieved through *transparent* padding on the `<button>`, not a visible button shape. This is the WP10 "touch-first, chrome-light" pattern — large invisible hit zones around lightweight glyphs.

Desktop layout unchanged.

## Design — Part 2: Accent consistency sweep

Migrate these three additional `--m-red` usages to `--accent`:

| File | Line | Selector | Reason |
|---|---|---|---|
| `site/src/layouts/BaseLayout.astro` | 896 | `a:hover` | Global link hover is an interactive state, not brand identity. |
| `site/src/layouts/BaseLayout.astro` | 939 | `footer a:hover` | Consistent with the footer stripe (Part 1.B). |
| `site/src/layouts/BaseLayout.astro` | 1092 | `.pivot-tab.active::after` | "Currently selected" indicator — should reflect user's accent (WP10 system-color propagation). |

Keep these as `--m-red` (true brand identity, not theme-driven):

| File | Line | Selector | Reason |
|---|---|---|---|
| `site/src/layouts/BaseLayout.astro` | 1065 | `.brand-seal` | Top-bar "粵食典" seal is the project Logo. |
| `site/src/layouts/BaseLayout.astro` | 907 | `.badge--seal` | "Seal" is semantically a red Metro stamp. |
| `site/src/components/MetroEmptyState.astro` | 27, 62 | 404/empty-state tile | Metro 404 red tile is a brand visual, comment in file already declares "safe across themes". |

## Design — Part 3: Project-wide UI bug audit

### Methodology

Drive the site with Playwright via the project's existing `probe-*.mjs` pattern (per [feedback_playwright_debug.md](../../../C:/Users/Jing Jiang/.claude/projects/d--Cantonese-Cuisine/memory/feedback_playwright_debug.md)).

### Viewports

- **Desktop:** 1280 × 800
- **Mobile:** 390 × 844 (iPhone 14 reference)

### Pages covered

For each of `cn`, `en`, `yue`:

- `/{locale}` — home
- `/{locale}/search` — empty state
- `/{locale}/search?q=<sample>` — results state
- `/{locale}/dishes/<sample-dish>` — detail page, plus HubPivot prev → next click sequence
- `/{locale}/categories/<sample-category>` — category page
- `/{locale}/nonexistent-url` — 404

### Per-page collection

- Viewport-fit screenshot (after page settled)
- Console errors / warnings
- Failed network requests (status ≥ 400)
- `document.body.scrollWidth > window.innerWidth` flag (horizontal overflow)

### Triage output

Write `docs/handoff/UI_AUDIT_2026-05-26.md` with one section per (page × viewport) combination, each finding tagged:

- **P0** — blocks core flow / broken feature / console-error spam
- **P1** — visual regression, layout glitch, theme inconsistency
- **P2** — nit, cosmetic, suggestion

The audit document is the deliverable. Whether and how to fix each item is decided after the audit lands.

## Verification

For Parts 1 & 2:
1. `cd site && npm run dev`
2. Drive the dev server with a Playwright probe that:
   - Loads each accent setting (cobalt/red/orange/emerald) via the swatch buttons
   - For each accent: load home, search, a dish detail page
   - Screenshot the affected elements (footer stripe, search-input focused, pivot active tab, HubPivot mobile)
   - Confirm that for non-red accents, the formerly-red elements visibly take the new accent color
   - Confirm `brand-seal` and `badge--seal` stay red across all accent settings
3. Mobile tap-target sanity: in mobile viewport, screenshot HubPivot region and verify chevrons sit ≥24 px from viewport edge (after the new padding).

For Part 3:
- The audit run *is* the verification — it ends with a written punch list.

## Out of scope (explicit)

- Replacing Unicode chevrons with SVG icons (current Light-weight chevrons are WP10-faithful).
- Adding swipe-gesture navigation to HubPivot on mobile (separate UX decision).
- Re-evaluating `--accent="red"` overlapping with `--m-red` — when the user picks the red accent, all these elements happen to align with brand red, which is fine.
- Fixing any specific bug found during the audit — those are negotiated case-by-case after the audit doc lands.
