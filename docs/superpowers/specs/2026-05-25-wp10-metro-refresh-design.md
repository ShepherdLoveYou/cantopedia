# WP10 Metro Refresh — Design

**Date:** 2026-05-25
**Status:** Draft, pending user review
**Repo:** Cantopedia 粵食典

## Problem

Current site (Astro 5 + hand-written CSS) hits WP10 aesthetics at the surface level — palette, typography, flat tiles, dark status bar — but feels **stiff and inert** in motion and depth. Specifically:

- **Static visuals** lack tactile WP10 polish: tile surfaces are too plain, no hover affordance, no Acrylic depth in nav/drawer.
- **Motion** is page-to-page fade + a small slide; missing the "alive" WP10 signature: panorama parallax, live tile flips, Ken Burns on hero photos, spring easing.
- **Components** missing: no toast, tooltip, accordion, carousel. Writing these from scratch produces inconsistent results.
- **Overall** reads as "Metro-flavored" rather than authentic WP10.

## Goals

1. Restore WP10 "alive" feel via 5 hand-crafted motion features.
2. Cover missing component types (toast / tooltip / accordion / carousel) via a CSS library so we don't hand-roll them.
3. Borrow 1 specific Fluent (Win11) effect — Reveal highlight — that strengthens (not breaks) Metro flatness.
4. Keep Astro's zero-runtime-JS-by-default posture. **No Vue.**
5. **Apply SOLID across the new code**: motion logic split into single-responsibility modules; components accept config via props; CSS variables expose extension points instead of hard-coding values.
6. **Unified i18n framework with per-language typography**: one CSS tree gated on `html[lang]` attribute. Per-language overrides for font stack, heading sizes, line-height, letter-spacing — driven from a single block of CSS variables, not scattered across pages.

## i18n Typography Framework

Real WP10 used different font stacks per region (Segoe UI in EN, 微软雅黑 in CN, 微软正黑體 in HK). The site currently treats zh / yue / en identically except for content. This makes Chinese headings feel **too heavy** (汉字方块结构 makes 3rem look like 4rem of English) and miss Cantonese-specific glyphs (嘅咁咗喺) on systems without an HK font.

**Design:**

- HTML `lang` is already set correctly: `zh-Hant` / `yue-Hant` / `en` ([BaseLayout.astro:58](../../site/src/layouts/BaseLayout.astro#L58)).
- CSS overrides keyed on `html[lang="..."]` selectors, exposing per-language CSS variables (`--lang-h1-size`, `--lang-body-leading`, `--lang-font-primary`, ...).
- Headings and body inherit from those vars instead of hard-coded values.
- Single source of truth: one CSS block in [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) under `<style is:global>`.

**Per-language values (rationale documented):**

| | EN (`lang="en"`) | ZH (`lang="zh-Hant"`) | YUE (`lang="yue-Hant"`) |
|---|---|---|---|
| Primary stack | Segoe UI → Open Sans → system | Noto Sans SC → 微软雅黑 → PingFang SC | **Noto Sans HK** → 微软正黑體 → PingFang HK |
| Serif stack | Crimson Pro → Georgia | Noto Serif SC → 思源宋體 | Noto Serif HK → 思源宋體香港 |
| `--lang-h1-size` | 3rem | 2.4rem (80%) | 2.4rem (80%) |
| `--lang-h2-size` | 2rem | 1.65rem | 1.65rem |
| `--lang-body-leading` | 1.65 | 1.55 | 1.55 |
| `--lang-h1-tracking` | -0.025em | 0.005em | 0.005em |
| Lightest weight | 200 | **300** (200 illegible for hanzi) | **300** |
| `font-size-adjust` | 0.5 | 0.55 | 0.55 |
| `line-break` | normal | strict | strict |

**Font loading change**: add Noto Sans HK + Noto Serif HK to Google Fonts URL. ~30 KB additional in font CDN, lazy-loaded only when `lang="yue-Hant"` page is shown (browsers de-prioritize unused weights/scripts).

**Why a unified framework (vs per-page CSS)**: pages don't know their language at the CSS level. Centralizing the rule "heading sizes / leading vary by lang" in one place means adding a new language = one block of CSS variables, not edits across every page.

## Non-Goals

- No Fluent design migration (Mica, drop-shadows, rounded corners) — these break Metro flatness.
- No Pivot 1:1 finger-tracking — separate architectural change, deferred to a possible Phase 2.
- No icon-library swap, no font-stack swap.
- No content / schema / i18n changes.

## Approach

**Plan 2+ (selected)**: MetroUI 5 CSS as component baseline + hand-crafted motion soul + selective Fluent borrow.

### Three layers

1. **Component baseline** — MetroUI 5 CSS classes for tile / appbar / pivot / dialog / toast / tooltip / accordion / carousel. Used as scaffold only; tile color / accent / typography continue to come from our own `:root` CSS variables.
2. **Motion soul** (hand-written) — five features below.
3. **Fluent borrow** — Reveal highlight on tile hover only.

### Five hand-crafted motion features

| # | Feature | Tech | Scope |
|---|---|---|---|
| M1 | **Spring easing** | swap `--fluent-curve-*` to spring cubic-bezier (`cubic-bezier(0.34, 1.4, 0.55, 1)`) for press/release and tile morph | Global var swap |
| M2 | **Ken Burns** | CSS `@keyframes` on hero `<img>` — slow `scale(1.0 → 1.08) translate(±2%, ±2%)` over 18–22s, alternate direction | Dish hero, sauce hero, browse cover |
| M3 | **Multi-layer Acrylic** | Stack `backdrop-filter: blur(24px) saturate(180%)` + SVG noise overlay (~6% opacity) + tinted half-transparent layer | Nav drawer + status bar only (NOT tiles) |
| M4 | **Panorama parallax** | Scroll listener on hero band: `transform: translateY(scrollY * 0.4)` on bg layer. RAF-throttled. `prefers-reduced-motion` opt-out | Dish hero, sauce hero, browse cover |
| M5 | **Live tile flip** | 3D `rotateX(180deg)` keyframe on 4 stats tiles on home; 5–8s interval, staggered by index; pauses on hover | Home page stats tiles only |

### Fluent borrow

| # | Feature | Tech | Scope |
|---|---|---|---|
| F1 | **Reveal highlight** | Track pointer position via CSS custom prop set on `pointermove`; radial-gradient mask with that prop as center; ~8% white | Tile hover state only |

### MetroUI integration

- Pull `metroui` v5 **CSS only** via CDN (`<link>` in `BaseLayout.astro` head), same pattern as before with metro4.
- Use `@layer metro` (or load before our own styles) so our `:root` variables and tile color overrides win.
- Use library classes for new components (toast / tooltip / accordion / carousel) and for tile / appbar / pivot baseline; **don't** adopt library's color tokens — keep ours.
- Library's JS pieces (if any) are NOT loaded. New components that need behavior (toast lifecycle, accordion toggle) get a small Astro inline-script handler (~20 lines each).

## Components

### Modified

- **[BaseLayout.astro](site/src/layouts/BaseLayout.astro)** — add MetroUI CDN link; swap easing vars to spring; add reveal-highlight CSS + pointer listener; refactor drawer/status-bar Acrylic from single `backdrop-filter` to multi-layer stack.
- **Dish hero / sauce hero / browse cover** — add Ken Burns animation class on hero img; add parallax data attribute on hero band; reveal-highlight on `.wp-tile`.
- **Home index** — wrap 4 stats tiles in flip-tile structure (front face + back face); add stagger timing.

### New

- **`site/src/components/Toast.astro`** — auto-dismiss toast triggered by global `cantopediaToast(msg)`.
- **`site/src/components/Accordion.astro`** — collapsible section using `<details>`/`<summary>`.
- **`site/src/components/Tooltip.astro`** — pure-CSS hover tooltip with 4 positions.
- **`site/src/lib/motion/parallax.ts`** — single-responsibility: parallax on `[data-parallax]` targets.
- **`site/src/lib/motion/reveal.ts`** — single-responsibility: pointer-tracked reveal highlight on `.wp-tile`.
- **`site/src/lib/motion/liveTile.ts`** — single-responsibility: stagger live-tile flip animation delays.
- **`site/src/lib/motion/index.ts`** — assembles the three above; exports `initMotion()`.
- **`site/src/styles/i18n-typography.css`** — per-language CSS variable definitions + font stacks. (Inlined into BaseLayout's `<style is:global>` block at build time.)

### Unchanged

- Content schemas, i18n logic, routing, search, build pipeline, GH Pages deploy.

## Data flow / state

No data-layer change. All work is presentation + motion.

## Error handling / fallbacks

- **`prefers-reduced-motion: reduce`** — disable M2 (Ken Burns), M4 (parallax), M5 (Live tile flip) entirely. M1 (spring) and F1 (reveal) stay since they're brief.
- **No `backdrop-filter` support** (older Firefox) — fall back to `--t-acrylic-fallback` solid surface (already in current code).
- **MetroUI CDN unreachable** — site degrades to current hand-written look; new components (toast etc.) lose styling but remain functional (text content visible).

## Testing

- **Visual smoke**: open home, browse, dish, sauce pages in light + dark, in Chrome + Firefox + Safari. Check Ken Burns runs, parallax works, reveal highlights follow cursor, live tiles flip.
- **Reduced-motion smoke**: enable OS setting, verify only M1/F1 still animate.
- **Build smoke**: `pnpm build` succeeds with 580+ pages, no new warnings.
- **Bundle check**: home + dish page JS payload increase under 5 KB (motion module + reveal handler).

No unit tests added — all behavior is visual / DOM. Existing vitest suite unchanged.

## Rollout

Single PR. No feature flag. If anything breaks, revert one commit.

## Spike (must happen first)

**30-minute MetroUI 5 spike before commit-to-plan**:

1. Add `<link>` to MetroUI 5 CSS in a scratch branch.
2. Drop a `.tile`, `.toast`, `.accordion` into a test page.
3. Check: do they render without breaking our existing styles? Does dark mode work? Is bundle size reasonable?

**Outcome gate:**
- ✅ Spike passes → proceed with this design.
- ❌ Spike fails (library broken, conflicts unmanageable) → fall back to Plan 1 (hand-write the 4 missing components, drop MetroUI). Motion features (M1–M5, F1) unchanged.

## Open questions resolved during brainstorm

- **Vue?** → No. A+B+C+D don't need it; static-content site doesn't justify the runtime.
- **MetroUI 4 vs 5?** → v5. v4 is older API but more battle-tested; v5 is current. Spike will confirm.
- **Where to put live tile flip?** → Home stats tiles only (4 cards). Not on dish/category tiles (would distract from reading).
- **Pivot 1:1 finger-track?** → Deferred. Independent architectural change. Re-evaluate after this phase ships.

## Out-of-scope follow-ups

- Phase 2: Pivot 1:1 finger-tracking (requires adjacent-page prerender + custom gesture controller + bypassing ClientRouter).
- Phase 2: Live tile multi-face content (rotate through "今日推介 / 隨機菜 / 最近瀏覽"). Phase 1 just flips front/back of the same content.
