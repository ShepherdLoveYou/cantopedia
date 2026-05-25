# WP10 Metro Refresh — Final Completion Report

**Date:** 2026-05-25
**Spec:** [docs/superpowers/specs/2026-05-25-wp10-metro-refresh-design.md](../superpowers/specs/2026-05-25-wp10-metro-refresh-design.md)
**Plan:** [docs/superpowers/plans/2026-05-25-wp10-metro-refresh.md](../superpowers/plans/2026-05-25-wp10-metro-refresh.md)
**Branch:** main, deployed to https://shepherdloveyou.github.io/cantopedia

## Phase 1 — 12-task implementation (✅ shipped)

| # | Feature | Status |
|---|---|---|
| 0 | MetroUI 5 spike | **FAIL** — 1.87MB CSS + body reset; hand-wrote components instead |
| 1 | i18n typography framework (html[lang]) | ✅ HK + TC fonts; per-language h1/h2/h3 sizes, line-height, weight floor |
| 2 | M1 spring easing | ✅ tile-press uses Continuum overshoot curve |
| 3 | M2 Ken Burns | ✅ A/B drift alternated by menu_no parity, 22s |
| 4 | M3 multi-layer Acrylic | ✅ noise SVG + blur + saturate on drawer/nav |
| 5 | motion SRP modules | ✅ parallax / reveal / liveTile / index |
| 6 | M4 panorama parallax | ✅ 0.35x scroll; uses CSS `translate` to compose with Ken Burns |
| 7 | M5 live tile flip | ✅ 4 home stats tiles, 1.8s stagger, 9s cycle |
| 8 | F1 reveal highlight | ✅ radial glow on .wp-tile hover |
| 9 | C1 Toast | ✅ global `cantopediaToast(msg)` |
| 10 | C2 Tooltip | ✅ 4 positions + arrow indicator |
| 11 | C3 Accordion | ✅ semantic `<details>` |

## Phase 2 — 10 rounds of post-deploy iteration (✅ all green)

| Round | Focus | Result |
|---|---|---|
| 1 | TC fonts for zh-Hant + idempotent toast assign | 2 important issues fixed |
| 2 | Drawer i18n freeze (user-reported) | Removed transition:persist + event delegation |
| 3 | ★★★★★ Tile hover float + entrance stagger | Added per WP10 spec |
| 4 | 6 fixes: html lang zh-Hant, drawer Escape, entrance vs hover, hover @media, will-change scoping, parallax stale targets | Caught by playwright smoke |
| 5 | Acrylic dark/light contrast | All WCAG AA across 4 locale×theme combos |
| 6 | A11y (Tab, Escape, inert, alt, h1, reduced-motion) | Found + fixed duplicate h1 + Ken Burns reduced-motion specificity |
| 7 | Component dark mode polish | Toast shadow + Tooltip arrow indicator |
| 8 | Performance | FCP 1020ms, LCP 1020ms, CLS 0 |
| 9 | Cross-browser | Chromium ✅, Firefox ✅, WebKit ✅ |
| 10 | Final smoke pass | All 5 harnesses green |

## Phase 3 — Previously-deferred items (✅ all completed)

| # | Feature | Status |
|---|---|---|
| 3a | Font weight pruning | ✅ EN min-weight 200→300; dropped 200 from Noto Sans SC + Open Sans; dropped unused 600s |
| 3b | ★★ Search results slide-up entrance | ✅ stagger 30ms per hit, 280ms fade+8px slide |
| 3c | Live-tile multi-face rotator (今日推介/隨機菜/最近瀏覽) | ✅ new featured tile on home, 6s rotation, image bg, localStorage-driven recent |
| 3d | ★★★★ Pivot 1:1 finger-tracking | ✅ touchmove translates `<main>` 1:1 with finger, rubber-band past threshold, edge hints |

## Phase 3 fix-ups

| Issue | Detection | Fix |
|---|---|---|
| Featured tile 404s on WebKit | `cross.mjs` smoke | `commonsThumb()` called at SSG (was: broken inline URL builder) |
| Ken Burns reduced-motion leak via `.kb-b` specificity | `a11y.mjs` smoke | Reduced-motion rule now `.kb, .kb.kb-b` (matches both) |

## Reusable test harness (committed)

| Script | Purpose |
|---|---|
| `site/scripts/smoke.mjs` | Visits 5 pages, asserts lang, tile count, drawer i18n, hover lift |
| `site/scripts/contrast.mjs` | WCAG contrast on body, nav, stat-label, drawer in light/dark × zh/en |
| `site/scripts/a11y.mjs` | Tab order, drawer Escape, inert, drawer-Tab escape, img alt, button labels, h1 count, html lang, reduced-motion |
| `site/scripts/perf.mjs` | FCP / LCP / CLS / transfer bytes |
| `site/scripts/cross.mjs` | Chromium / Firefox / WebKit |

Run `node site/scripts/<name>.mjs` to verify against live deploy.

## Final bundle (post Phase 3)

- JS: 13.6 KB transferred (gzipped)
- CSS: 7.0 KB transferred
- Fonts: ~900 KB (reduced from 1.2 MB after weight pruning)
- Total transfer: ~1.0 MB

## i18n typography deltas

| | EN (`lang="en"`) | ZH (`lang="zh-Hant"`) | YUE (`lang="yue-Hant"`) |
|---|---|---|---|
| Primary font | Segoe UI / Open Sans | **Noto Sans TC** / 微软正黑體 / SC | **Noto Sans HK** / 微软正黑體 |
| h1 size | 3rem | 2.4rem (80%) | 2.4rem |
| Body line-height | 1.65 | 1.55 | 1.55 |
| Min font-weight | **300** (was 200, raised in Phase 3) | 300 | 300 |
| h3 size | 1.25rem | 1.1rem | 1.1rem |

## What's still N/A

- ★★★★ "Bottom tab switch" — UI uses top status bar + side drawer, no bottom tabs
- ★★ "Favorite heart bounce" — no favorite feature exists (would be a new feature, not polish)

## Total commit count

From Phase 1 spec commit (`3db4675`) through Phase 3 final fix: **~40 commits**.

```
git log --oneline 3db4675..HEAD
```
