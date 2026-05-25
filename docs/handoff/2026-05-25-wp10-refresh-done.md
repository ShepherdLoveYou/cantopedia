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
| 6 | A11y (Tab order, drawer Escape, inert, img alt, h1 count, reduced-motion) | Found + fixed duplicate h1 on browse pages |
| 7 | Component dark mode polish | Toast shadow + Tooltip arrow indicator |
| 8 | Performance | FCP 1020ms, LCP 1020ms, CLS 0, JS 13.6KB |
| 9 | Cross-browser | Chromium ✅, Firefox ✅, WebKit ✅ |
| 10 | Final smoke pass | All 5 harnesses green |

## Reusable test harness (committed)

| Script | Purpose |
|---|---|
| `site/scripts/smoke.mjs` | Visits all locale homes + browse + dish; asserts lang, tile count, drawer i18n, hover lift |
| `site/scripts/contrast.mjs` | Snapshots home + drawer in light/dark; computes WCAG ratios |
| `site/scripts/a11y.mjs` | Tab order, drawer Escape, inert, img alt, button label, h1 count, reduced-motion |
| `site/scripts/perf.mjs` | FCP / LCP / CLS / transfer bytes |
| `site/scripts/cross.mjs` | Chromium / Firefox / WebKit sanity |

Run `node site/scripts/<name>.mjs` to verify against live deploy.

## Bundle

- JS: 13.6 KB transferred (BaseLayout 23 KB + ClientRouter 13 KB pre-compression, gzipped to ~13.6 KB total)
- CSS: 6.7 KB transferred
- Fonts: 1.2 MB (Noto Sans SC + TC + HK + Serif variants + Crimson + Open Sans, `display=swap`)
- Total transfer: ~1.26 MB

Fonts dominate. Could subset by language for ~70% reduction if needed. Out of scope for now since FCP < 1.1s with `display=swap`.

## i18n typography deltas

| | EN (`lang="en"`) | ZH (`lang="zh-Hant"`) | YUE (`lang="yue-Hant"`) |
|---|---|---|---|
| Primary font | Segoe UI / Open Sans | **Noto Sans TC** / 微软正黑體 / Noto Sans SC | **Noto Sans HK** / 微软正黑體 |
| h1 size | 3rem | 2.4rem (80%) | 2.4rem |
| Body line-height | 1.65 | 1.55 | 1.55 |
| Min font-weight | 200 | 300 | 300 |
| h3 size | 1.25rem | 1.1rem | 1.1rem |

## Deferred (Phase 2 / Phase 3)

- **Pivot 1:1 finger-tracking** — architectural change; needs adjacent-page prerender + custom gesture controller. Re-evaluate after user feedback.
- **Live tile multi-face content** — Phase 1 flips front/back of same metric only. Could rotate "今日推介 / 隨機菜 / 最近瀏覽".
- **Font subsetting** — perf optimization. Not urgent (FCP fine).
- **Carousel component** — listed in spec but no consumer page yet; defer until needed.

## Known minor items

- 4 ★ "bottom tab switch" motion (user-requested table) is not applicable to this site's chrome — we use top status bar + side drawer, no bottom tab.
- 2 ★ "favorite heart bounce" — no favorite/bookmark feature exists yet; defer.
- 2 ★ "search slide-up" — search page exists but list animation not added; can be added when search page polish work happens.

## Commit summary

All changes from spec to final iteration: ~30 commits over Phase 1 + 2.

```
git log --oneline 3db4675..HEAD
```

shows the full sequence.
