# WP10 Metro Refresh — Completion Report

**Date:** 2026-05-25
**Spec:** [docs/superpowers/specs/2026-05-25-wp10-metro-refresh-design.md](../superpowers/specs/2026-05-25-wp10-metro-refresh-design.md)
**Plan:** [docs/superpowers/plans/2026-05-25-wp10-metro-refresh.md](../superpowers/plans/2026-05-25-wp10-metro-refresh.md)
**Branch:** main

## What shipped (12 tasks)

| # | Feature | Commit | Status |
|---|---|---|---|
| 0 | MetroUI 5 spike | `919c57a` | **FAIL** — 1.87MB CSS + aggressive body reset. Hand-wrote components instead |
| 1 | i18n typography framework | `5d8c51f` → `db710af` | ✅ html[lang] keyed; HK fonts added; page-level type propagated |
| 2 | M1 spring easing | `80bebf4` | ✅ tile-press uses WP10 overshoot curve |
| 3 | M2 Ken Burns | `f221da4` | ✅ alternates A/B by menu_no parity, 22s cycle |
| 4 | M3 multi-layer Acrylic | `57d3e13` | ✅ noise SVG + blur + saturate on drawer/nav |
| 5 | motion SRP modules | `6a2efbe` | ✅ parallax/reveal/liveTile + index composition root |
| 6 | M4 panorama parallax | `0a0a242` → `79a3a0c` | ✅ 0.35x scroll; fix: uses CSS `translate` to compose with Ken Burns |
| 7 | M5 live tile flip | `c834964` | ✅ 4 home stats tiles, 1.8s stagger, 9s cycle |
| 8 | F1 reveal highlight | `89d8fa2` | ✅ radial glow on .wp-tile hover |
| 9 | C1 Toast | `637b48f` + `cf819c5` | ✅ global `cantopediaToast(msg)` (component + BaseLayout mount in 2 commits) |
| 10 | C2 Tooltip | `5a3e184` | ✅ 4 positions, pure CSS |
| 11 | C3 Accordion | `7566bf8` | ✅ semantic `<details>` + animated chevron |

## SOLID summary

- **SRP**: motion split into 3 single-responsibility modules
- **OCP**: per-language theming via `html[lang]` CSS vars — adding a 4th language = 1 new block
- **DI**: pages depend on `initMotion()` abstraction; concrete `addEventListener` calls live inside modules

## i18n typography per-language deltas

| | EN (3rem h1) | ZH-Hant (2.4rem) | YUE-Hant (2.4rem) |
|---|---|---|---|
| Primary font | Segoe UI / Open Sans | Noto Sans SC / 微软雅黑 | **Noto Sans HK** / 微软正黑體 |
| Line-height | 1.65 | 1.55 | 1.55 |
| Min weight | 200 | 300 | 300 |
| h3 size | 1.25rem | 1.1rem | 1.1rem |

## Deferred (Phase 2)

- **Pivot 1:1 finger-tracking** — needs adjacent-page prerender + bypass of ClientRouter. Architectural change.
- **Live tile multi-face content** — front/back of same metric only; future could rotate "今日推介 / 隨機菜 / 最近瀏覽".

## Open follow-ups

- 10+ rounds of post-deploy iteration to eliminate bugs, logic issues, sanity issues. Tracked in todos.

## Build status

Final build before deploy: 580 pages indexed, no errors. Pagefind warns about lack of stemming for `zh` / `yue-hant` (cosmetic, not a regression).

## Bundle size

| Asset | Size |
|---|---|
| `BaseLayout.astro_*.js` (drawer, theme, motion init) | 23 KB |
| `ClientRouter.astro_*.js` (Astro built-in) | 13 KB |
| `index.*.js` | 2.3 KB |
| **Total app JS** | **~38 KB** (well under 100 KB target) |

Total diff vs. plan baseline: **+527 / -41** lines across 11 files.

## Final cross-cutting review (2026-05-25)

Status: **READY TO SHIP**. No blockers.

Verified:
- `--lang-*` vars consumed by all 3 new components + live tile back face
- `initMotion()` correctly composes parallax/reveal/liveTile; all modules idempotent
- Parallax → Ken Burns conflict fix intact (parallax owns CSS `translate`, Ken Burns owns `transform`)
- No CSS conflicts on `.wp-tile::before` (reveal glow)
- `Tooltip` / `Accordion` are not yet imported anywhere — utilities for future use, acceptable per scope

## Files changed (high-level)

- `site/src/layouts/BaseLayout.astro` — most changes (i18n vars, motion mount, Acrylic, Reveal CSS, Ken Burns keyframes, Toast mount, spring curves)
- `site/src/lib/motion/{parallax,reveal,liveTile,index}.ts` — new SRP modules
- `site/src/components/{Toast,Tooltip,Accordion}.astro` — new
- `site/src/pages/[locale]/index.astro` — live tile structure + flip CSS
- `site/src/pages/[locale]/dishes/[id].astro` — `.kb` class, `data-parallax`, page-level type propagation
