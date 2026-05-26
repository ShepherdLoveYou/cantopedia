# UX visual audit — text/background contrast and legibility sweep

**Date:** 2026-05-26
**Scope:** Visual (not algorithmic) inspection of the site across all theme + accent + viewport combinations to find text/background contrast bugs, including the class of "text merges into background" that was already caught in dark-mode search input (P1#3 in `UI_AUDIT_2026-05-26`).

## Background

The user has been seeing UX bugs where text becomes hard to read because it blends into its background. The first such bug — dark-mode search input rendering white text on `var(--t-ink)` (which resolves to white in dark mode) — was caught manually during last session's UI audit and fixed (commit `d40f6a3`). The user suspects more instances exist.

This audit deliberately uses **visual inspection by the assistant**, not axe-core / WCAG ratio computation. Reasons:

- axe-core checks computed CSS contrast on the rendered state. It misses:
  - Text over acrylic / noisy backgrounds (the site uses `--acrylic-noise` overlays)
  - Text over images, gradients, or partially-transparent overlays
  - States dependent on JS-rendered content or interaction
- Visual review also surfaces non-contrast UX issues that aren't strictly accessibility violations but read as "bug" (misaligned labels, z-index conflicts, icon ambiguity)

## Goals

1. Produce a comprehensive, screenshot-evidenced punch list of legibility / contrast / "same-color merge" bugs.
2. Cover the full personalization matrix so we know whether a given bug is universal or limited to specific theme × accent combinations.
3. Hand off the punch list — fixes are negotiated case-by-case after the list lands.

## Non-goals

- Fixing bugs. Audit produces evidence, not patches.
- Running automated a11y tools (axe-core, Lighthouse, etc.). Out of scope for this round.
- Performance, semantic HTML, or non-visual UX issues (keyboard nav, screen-reader behavior).
- Touching the existing color-consistency probe or audit probe.

## Scan matrix

| Dimension | Values | Count |
|---|---|---|
| Theme | light, dark | 2 |
| Accent | cobalt, red, orange, emerald | 4 |
| Viewport | desktop 1280×800, mobile 390×844 | 2 |
| Page | home, search-empty, search-results, dish-detail, category, notfound | 6 |
| Locale | zh only | 1 |

Total: **96 screenshots**.

Locale dimension dropped — text language doesn't affect color tokens; running 3× more shots is wasted effort. If a locale-specific issue is found informally during review (e.g. via existing UI audit screenshots), it gets folded into the punch list.

## Probe design — `site/scripts/probe-ux-visual.mjs`

New file, parallel to `probe-ui-audit.mjs`. Reasons for separation:

- Different output dir (`audit-output/visual/`) so screenshots don't collide with the color-consistency / overflow audit baselines.
- Different concerns — `probe-ui-audit.mjs` already collects errors / overflow / netfails; this probe is screenshot-only.

### Theme + accent switching

Theme is set by adding/removing `.dark-side` on `<html>` and writing `localStorage.cantopedia-theme`. Accent is set by `[data-accent]` on `<html>` and `localStorage.cantopedia-accent`. Both already-existing patterns from prior probes.

### Sample page resolution

Dish-detail href is read from home page anchors. Category href is constructed deterministically as `/cantopedia/zh/browse/main` — the home page does not link to category pages directly in the current tile layout (this gap was noted in `UI_AUDIT_2026-05-26.md` out-of-band). The actual category route in the codebase is `[locale]/browse/[category].astro`; `main` is one of the 8 fixed categories declared in `pipeline/pipeline/models.py` `CategoryId` literal and is guaranteed to render.

The probe's `toUrl()` helper must handle root-relative paths correctly (regression-tested by last session's bug fix in commit `d8cfb10`).

### Output naming convention

`audit-output/visual/{theme}_{accent}_{viewport}_{page}.png` — e.g. `dark_emerald_mobile_dish-detail.png`. Predictable, sortable, easy to grep.

### Full-page screenshots

`page.screenshot({ fullPage: true })` for everything. Long pages (e.g. dish-detail) produce tall PNGs; that's fine for visual review.

## Review methodology

After the probe finishes (~96 PNGs + a `findings.json` index), the assistant reads the screenshots using the Read tool's image-mode (Claude Code supports image rendering). Grouping strategy:

**Group by (page × viewport)** — 12 groups of 8 (4 accent × 2 theme). Within each group, the assistant compares the 8 variants side-by-side to spot bugs that appear in specific combinations.

For each group, the assistant looks for:

1. **Text-blends-into-background** — the originating concern. Both static text and interactive states (input contents, buttons).
2. **Accent-color readability** — accent-colored text (`a:hover`, active tab underline) needs sufficient contrast against the surface it sits on. Emerald (#008A00) on dark backgrounds may have a hairline contrast issue; orange (#FA6800) on light may shimmer.
3. **Overlay / acrylic interference** — text on top of noisy / blurred / semi-transparent backgrounds.
4. **State indicators** — focus rings, hover states, active states. Some only fire on interaction; for static screenshots, scope is whatever ships in the captured DOM.
5. **Image-text overlap** — text overlaying images (dish hero, featured tile).
6. **Misc UX bugs spotted incidentally** — alignment, clipping, broken images, missing icons. Not the primary lens, but noted.

For each finding, the assistant records:
- Severity (P0 / P1 / P2)
- Evidence (specific screenshot filename(s))
- Reproduction matrix (which theme × accent × viewport × page combos exhibit it)
- Likely root cause (1-2 sentences with file:line if guess is confident)

## Punch list output — `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md`

Structure (matches `UI_AUDIT_2026-05-26.md` convention so they sit alongside cleanly):

```markdown
# UX Visual Audit — 2026-05-26

**Source data:** `site/audit-output/visual/` (gitignored; rerun via `node scripts/probe-ux-visual.mjs`)
**Matrix:** 2 themes × 4 accents × 2 viewports × 6 pages = 96 screenshots
**Locale:** zh

## Summary
- Total screenshots reviewed: 96
- P0 findings: N
- P1 findings: N
- P2 findings: N

## Findings

### P0 — blockers (text unreadable, feature unusable)
<bullets>

### P1 — visible regressions (low contrast, text blends, distracting)
<bullets>

### P2 — nits (subtle, polish, suggestion)
<bullets>

## Out-of-band observations
<anything that surfaced incidentally but doesn't fit P0/P1/P2>
```

## Verification

The audit IS the deliverable. No probe runs to verify "the audit ran". Done criteria:
- 96 PNGs in `site/audit-output/visual/`
- `findings.json` index alongside
- `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md` committed

## Out of scope (explicit)

- Fixing any bug found. That's a separate negotiation after the list lands.
- Locale dimension (zh only).
- Animated / hover / focus states beyond what the static screenshot captures.
- Mobile devices other than iPhone-14-sized 390×844.
- WCAG ratio computation. If a finding's borderline, the assistant calls it as a judgment finding, not an algorithmic one.
