# UX Visual Audit — 2026-05-26

**Source data:** `site/audit-output/visual/` (gitignored; rerun via `node scripts/probe-ux-visual.mjs`)
**Matrix:** 2 themes × 4 accents × 2 viewports × 6 pages = 96 screenshots
**Locale:** zh

## Summary

- Total screenshots reviewed: 96
- P0 findings: 0
- P1 findings: 2
- P2 findings: 4

## Findings

### P0 — blockers (text unreadable, feature unusable)

- _None._

### P1 — visible regressions (low contrast, text blends, distracting)

- **dark × all accents × desktop+mobile × search-empty — Focused search input placeholder is near-invisible (light-gray on white).** Evidence: `dark_cobalt_desktop_search-empty.png`, `dark_red_desktop_search-empty.png`, `dark_orange_desktop_search-empty.png`, `dark_emerald_desktop_search-empty.png`, `dark_cobalt_mobile_search-empty.png`, `dark_red_mobile_search-empty.png`, `dark_orange_mobile_search-empty.png`, `dark_emerald_mobile_search-empty.png`. Description: The page auto-focuses the search input on load; in dark theme the focused input flips to white background but the placeholder text "搜尋菜式、配料、醬料…" stays in `--t-ink-dim` (a dim light gray), rendering it almost unreadable on white. Likely cause: `site/src/pages/[locale]/search.astro:121` — `.search-input:focus { background: var(--t-ink); color: var(--t-bg); }` inverts bg+text but doesn't override the placeholder color from line 120.
- **light × all accents × desktop+mobile × search-empty+search-results — Focused search input is dark in light theme (Windows-Phone-style inversion-on-focus looks like a bug).** Evidence: `light_cobalt_desktop_search-empty.png`, `light_emerald_desktop_search-empty.png`, `light_cobalt_desktop_search-results.png`, `light_orange_desktop_search-results.png`, `light_cobalt_mobile_search-empty.png`, `light_emerald_mobile_search-results.png`. Description: On light theme, the focused input renders with a near-black background and light text — visually the only dark-mode-styled element on an otherwise white page. Readable but feels like a regression; the accent border alone would convey "focused". Likely cause: same line as above (`search.astro:121`) — the focus-state inversion is overly aggressive.

### P2 — nits (subtle, polish, suggestion)

- **light × all accents × desktop+mobile × home+category — Brand title "粵食典" and Hub edge-links ("主菜", "所有菜式") render in dim gray on white.** Evidence: `light_cobalt_desktop_home.png`, `light_red_desktop_home.png`, `light_orange_desktop_home.png`, `light_emerald_desktop_home.png`, `light_cobalt_mobile_home.png`, `light_cobalt_desktop_category.png`. Description: The centered brand wordmark and the left/right Hub chevron-labels appear washed out (likely `--t-ink-dim` or similar). Functional but lacks presence on the primary landing page. Needs devtools repro to confirm token.
- **all themes × all accents × desktop × all pages — "EN" locale badge in top-right looks like a stuck active-pill / dropdown overlay.** Evidence: `light_cobalt_desktop_home.png`, `light_cobalt_desktop_dish-detail.png`, `dark_cobalt_desktop_home.png`, `dark_emerald_desktop_dish-detail.png`. Description: "EN" appears in a dark-filled rounded pill that floats below the dark top nav across every desktop screenshot. It reads as either a frozen-open dropdown or an unintentionally heavy active-state. Needs devtools repro — could be a Playwright focus artifact in the probe rather than a real UI bug, but the consistency suggests CSS.
- **dark × all accents × desktop+mobile × search-results — Inline `<code>pnpm build</code>` low contrast on dark.** Evidence: `dark_cobalt_desktop_search-results.png`, `dark_emerald_desktop_search-results.png`, `dark_cobalt_mobile_search-results.png`, `dark_orange_mobile_search-results.png`. Description: The dev-only "Search index not available in dev. Run `pnpm build`." message shows the `<code>` pill with mid-gray text on slightly-lighter-gray background — readable but lower contrast than the surrounding body. Likely cause: shared `code` style with `background: var(--t-plate)` and `color: var(--t-ink)` not stepping up enough against dark `--t-bg`.
- **all themes × all accents × desktop+mobile × search-results — "Search index not available in dev. Run pnpm build." message is English-only on zh locale.** Evidence: `light_cobalt_desktop_search-results.png`, `dark_emerald_mobile_search-results.png`. Description: Dev-only diagnostic copy is hardcoded English. Likely intentional (dev affordance) but worth flagging since it's visible to anyone running `pnpm dev` in zh.

## Out-of-band observations

- **Probe viewport inconsistency on `category` page.** `light_cobalt_desktop_category.png` and `light_red_desktop_category.png` render at ~960×720 instead of the expected 1280×720 used by the other two light desktop category captures and all dark ones. Similarly `light_cobalt_mobile_category.png` and `light_red_mobile_category.png` show content overflow on the right edge. The pattern (only cobalt+red on light) suggests `scripts/probe-ux-visual.mjs` may be racing a theme/accent reflow against the screenshot call when the page transitions to a wider Hub layout — not a UI bug, but the audit cells affected can't be relied on for contrast judgement and should be re-shot. Pages render the same content; only the screenshot framing differs.
- **Intermittently missing tile icons/labels in mobile category captures.** `light_orange_mobile_category.png` — the red "頭盤/小食" tile is missing its cup icon and label entirely (solid red square only). `dark_emerald_mobile_category.png` — the teal "湯米線/喇沙" tile is missing its label. Likely image/icon load timing during screenshot, not a real UI bug, but worth a `waitForLoadState('networkidle')` plus a small `waitForTimeout` in the probe before snapping.
- **Tile imagery varies between adjacent cells.** Across light/dark home and category captures, the "Today's recommendation" hero tile and the secondary "炒飯" tile show different dish images per screenshot (salt-pepper-shrimp vs. fried rice vs. youtiao vs. char-siu pancake). This is presumably randomised per page load and is _not_ a bug, but it makes diffing across the matrix harder. If determinism is wanted for future audits, seed the random pick on the URL.
- **Mobile footer is cut by the bottom AppBar overlay.** On mobile home and category captures, the footer "© 2026 SHEPHERDLOVEYOU · GITHUB · …" text is partially overlaid by the floating AppBar pill. Not unreadable, but worth a small bottom padding bump on `<main>` or a translucent shadow under the AppBar to separate the two layers. Affects all 8 mobile-home + mobile-category captures.
- **Pivot tab active-indicator color hard to verify at thumbnail resolution.** On the dish-detail pages, the underline under the active "配料" tab appears to vary subtly with accent (cobalt vs red vs orange vs emerald) but at 1280×800 PNG resolution it's near-impossible to confirm pixel-level color. The underlying CSS at `site/src/components/PivotPage.astro:89` correctly uses `border-bottom: 3px solid var(--accent)`, so this is presumably fine — flagging only to note that the audit can't strongly confirm or refute by eye.
