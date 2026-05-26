# Phase A+F — Bottom AppBar Migration + Default Dark + Accent Picker

**Date**: 2026-05-26
**Branch target**: `feat/wp10-metroui`
**Status**: Draft for user review
**Brainstormed with**: superpowers:brainstorming + ultrathink

---

## 1. Context

The `feat/wp10-metroui` branch has already brought the Cantopedia site **80% of the way** to the brief's "完全复刻 Windows 10 Mobile" target. The Hub (9-panel horizontal pivot), 3D card-flip Live Tiles, View Transitions tile-to-page morph, perspective Tilt-press, `border-radius: 0` discipline, Pivot detail page, Metro UI 5 integration, dark/light toggle — all in place. See [Hub.astro](../../../site/src/components/Hub.astro), [BaseLayout.astro](../../../site/src/layouts/BaseLayout.astro), and the [4 hour ago commit](https://github.com/ShepherdLoveYou/cantopedia/commit/dd255f0) `fix(cat-tile): add perspective: 800px to parent for proper 3D card-flip`.

The remaining 20% breaks into 6 gaps (A–F). This spec scopes **Phase A + Phase F bundled** because they share `BaseLayout.astro` surface and are tightly coupled:

- **Phase A**: Bottom-anchored AppBar replacing the current top horizontal nav (brief §4 "系统全局底栏").
- **Phase F**: Default dark theme + 4-color accent picker (brief §🎨 配色方案 + §"深浅主题切换").

Phases B (Donut + Checkbox), C (panorama 大字), D (AppList jump list), E (kitchen timer tile) are deliberately **out of scope** — each will get its own spec.

User has approved (2026-05-26 brainstorm):
1. **Rhythm**: Focus Phase A+F merged spec; B/C/D/E independent specs later.
2. **AppBar shape**: Top nav fully migrates to bottom (no top bar retained — screen top empty for future panorama header).
3. **Default theme**: Change default to dark (WP10 original flavor).
4. **Pivot tabs**: Keep existing 4 + add nutrition donut = 5 total (decided for Phase B, not this spec).

User hard requirement: **as close as possible to authentic Windows 10 Mobile UI**, all numerical values must trace to Microsoft source documents.

---

## 2. WP10 Mobile UI Reference Baseline

All numerical values used in this spec are quoted from Microsoft archived documentation. Listed once here, referenced by section number throughout.

### 2.1 Animation timing (UWP / WinUI)
Source: [Timing and easing — Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing)

| Token | Value |
|---|---|
| ControlNormalAnimationDuration | **250ms** |
| ControlFastAnimationDuration | **167ms** |
| ControlFasterAnimationDuration | **83ms** |

### 2.2 Easing curves (Fluent Motion)
Source: same as 2.1.

| Curve | cubic-bezier | Usage |
|---|---|---|
| Decelerate (Fast Out, Slow In) | `cubic-bezier(0, 0, 0, 1)` | Entry, spawn, return to rest |
| Accelerate (Slow Out, Fast In) | `cubic-bezier(1, 0, 1, 1)` | Exit, escape |
| Standard | platform default | Object expand/contract |

### 2.3 Page transition durations
Source: [Motion in practice — Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/develop/motion/motion-in-practice)

| Transition | Duration | Easing |
|---|---|---|
| Forward Out (fade out) | 150ms | Accelerate |
| Forward In (slide up 150px) | 300ms | Decelerate |
| Backward Out (slide down 150px) | 150ms | Accelerate |
| Backward In (fade in) | 300ms | Decelerate |
| Object Expand (grow) | 300ms | Standard |
| Object Contract | 150ms | Accelerate |

### 2.4 Application Bar geometry
Source: [The Windows Phone Application Bar — Microsoft Learn](https://learn.microsoft.com/en-us/archive/blogs/amar/the-windows-phone-application-bar) + [Working with the Windows Phone Application Bar — Visual Studio Magazine](https://visualstudiomagazine.com/articles/2012/03/30/windows-phone-application-bar.aspx)

| Property | Value |
|---|---|
| Bar height (Opacity=1, default state) | **72 px** |
| Bar Opacity < 1 | overlays content, doesn't reduce page height |
| Button icon image size | 48 × 48 px |
| Button foreground graphic | 26 × 26 px centered in the 48×48 |
| Button circle outline | drawn by AppBar itself, NOT in source image |
| Button icon color | white foreground on transparent background; system inverts per theme |
| Max button count | **4** |
| Max MenuItem count | unlimited, but >5 forces scroll |
| MenuItem text length | recommended 14-20 chars |
| Position | always anchored to bottom (near hardware Back/Start/Search) |

### 2.5 Pivot control behavior
Source: [Pivot — Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pivot) + [Pivot and Hub Controls Design Guidelines](https://learn.microsoft.com/en-us/archive/technet-wiki/24035.pivot-and-hub-controls-design-guidelines)

- Two modes: **Stationary** (all headers fit, tap-only) vs **Carousel** (headers overflow, tap rotates active to first position).
- Carousel: avoid >5 headers.
- Hub/Pivot total: recommended ≤6-7 panels for performance and UX.
- Gestures: tap header / swipe horizontal on header / swipe horizontal on content.

### 2.6 Live Tiles (WP 8.1)
Source: [Windows Phone 8.1 Live Tiles — Microsoft Learn](https://learn.microsoft.com/en-us/archive/blogs/thunbrynt/windows-phone-8-1-for-developerslive-tiles)

- Tile sizes: Square150x150 (Medium), Wide310x150 (Wide), Square71x71 (Small). Large 310x310 is Windows-only, ignored on phone.
- Notification queue max: **5 tiles** (down from 9 in WP8 Cyclic).
- Transition: flip (Ken Burns pan from WP8 Cyclic was dropped).

### 2.7 Tilt Effect
Source: [Tilt effect for Windows Phone controls — Peter Torr, MSDN](https://learn.microsoft.com/en-us/archive/blogs/ptorr/tilt-effect-for-windows-phone-controls)

- Attached props: `TiltStrength` (0–1, projection amount), `PressStrength` (0–1, depression amount).
- Math: `xAngle = asin((y - halfH) / halfH) * 180/π`, `yAngle = acos((x - halfW) / halfW) * 180/π`.
- Triggers: pointerdown enters tilt; pointerup/cancel/leave releases.
- Implementation in this repo: [BaseLayout.astro:192-210](../../../site/src/layouts/BaseLayout.astro) — `MAX = 3deg`, `scale 0.96` on press. Spec-compliant; no change needed in Phase A+F.

### 2.8 WP8/WP10 Mobile system accent palette (20 colors)
Source: [Themes and accent colors — Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/dn772323(v=vs.85))

| ID | Name | Hex | ID | Name | Hex |
|---|---|---|---|---|---|
| 0 | Lime | `#A4C400` | 10 | Crimson | `#A20025` |
| 1 | Green | `#60A917` | 11 | Red | `#E51400` |
| 2 | Emerald | `#008A00` | 12 | Orange | `#FA6800` |
| 3 | Teal | `#00ABA9` | 13 | Amber | `#F0A30A` |
| 4 | Cyan | `#1BA1E2` | 14 | Yellow | `#E3C800` |
| 5 | Cobalt | `#3E65FF` | 15 | Brown | `#825A2C` |
| 6 | Indigo | `#6A00FF` | 16 | Olive | `#6D8764` |
| 7 | Violet | `#AA00FF` | 17 | Steel | `#647687` |
| 8 | Pink | `#F472D0` | 18 | Mauve | `#76608A` |
| 9 | Magenta | `#D80073` | 19 | Taupe | `#87794E` |

OEM can register up to 4 additional custom accents (`CustomAccentColor1`–`4`).

### 2.9 Acrylic blur recipe (Fluent for Web)
Source: [DIY: A Web Version of the Fluent Design System's Acrylic Material — Microsoft Design (Medium)](https://medium.com/microsoft-design/diy-a-web-version-the-fluent-design-systems-acrylic-material-fe2eac2a40bb)

```css
backdrop-filter: blur(30px) saturate(125%);
background-color: rgba(R, G, B, 0.3);
```

The Medium recipe omits the noise/grain texture present in the native UWP material; this spec follows the web variant.

### 2.10 Typography
Source: [Segoe UI font family — Microsoft Learn](https://learn.microsoft.com/en-us/typography/font-list/segoe-ui)

- Weights available: Light, Semilight, Regular, Semibold, Bold.
- Current site already uses `"Segoe UI", -apple-system, sans-serif` with Noto Sans HK/SC/TC fallbacks for CJK. No change.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│ <html.dark-side>  ← default class (was opt-in)   │
│ ┌──────────────────────────────────────────────┐ │
│ │ <main>                                       │ │
│ │   (Hub / Pivot detail / AppList / Search)    │ │
│ │   padding-bottom: 88px ← new (was 0)         │ │
│ │                                              │ │
│ │   [Top status strip — slim, brand+locale]    │ │
│ │   (replaces the current full top nav)        │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ <nav class="app-bar app-bar--bottom">  ★ NEW │ │
│ │ height 72px, backdrop-filter Acrylic         │ │
│ │ [🏠 home] [🔍 search] [🎲 random] [⋯ more]  │ │
│ │                                              │ │
│ │ on tap ⋯: menu slides UP with:               │ │
│ │   • Theme: ◐ light  /  ● dark                │ │
│ │   • Accent: ● ● ● ●  (Cobalt/Red/Orange/Em)  │ │
│ │   • About                                    │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Touched files (estimated):**
- `site/src/layouts/BaseLayout.astro` — rewrite top nav → top status strip + bottom AppBar.
- `site/src/styles/` (or BaseLayout inline) — new AppBar styles, new accent CSS variables.
- `site/src/lib/theme.ts` (new) — extract theme + accent state from inline scripts to a small module (file currently inline in BaseLayout; extract because Phase F adds accent on top, file is getting too large).
- `site/src/lib/hubScripts.ts` — verify Featured tile + Hub-nav don't rely on top nav presence.
- Every page's `<main>` — already SSR-driven by BaseLayout's `<slot/>`, only padding-bottom change.

**Untouched files (locked):**
- `Hub.astro`, `HubPivot.astro`, `PivotPage.astro`, `PivotTab.astro`, `AppListPanel.astro`, `dishes/[id].astro` — all consumers of the layout, not the chrome.
- `categoryColors.ts` — category palette stays per-category; accent is separate.

---

## 4. Phase A: Bottom AppBar — Detailed Design

### 4.1 Geometry

| Property | Value | Source |
|---|---|---|
| Bar height | **72px** | §2.4 |
| Position | `position: fixed; bottom: 0; left: 0; right: 0;` | §2.4 |
| Z-index | `1000` (above View Transitions) | implementation detail |
| Background | dark theme: `rgba(0, 0, 0, 0.6)` over `backdrop-filter: blur(30px) saturate(125%)`; light theme: `rgba(255, 255, 255, 0.7)` over same filter | §2.9 |
| Top border | dark: `1px solid rgba(255, 255, 255, 0.08)`; light: `1px solid rgba(0, 0, 0, 0.08)` | derived from WP10 separator |
| Layout | CSS Grid: 4 equal columns + (optional) menu overlay | §2.4 (max 4 buttons) |
| Page padding-bottom | **88px** (72 bar + 16 buffer) on all `<main>` | new |

### 4.2 Button slots (exactly 4, per §2.4)

| Slot | Icon (Metro mif-*) | Label key | Action |
|---|---|---|---|
| 1. Home | `mif-home` | `nav_home` | navigate to `/{locale}/` |
| 2. Search | `mif-search` | `nav_search` | navigate to `/{locale}/search` |
| 3. Random | `mif-shuffle` | `nav_random` | client-side: pick random dish from `window.__hubBoot.dishesData`, navigate to `/{locale}/dishes/{id}` |
| 4. More (`⋯`) | `mif-more-vert` | `nav_more` | open menu overlay (see §4.4) |

The current top-nav theme button + locale switcher both **move into the More menu** (§4.4). This is the user-approved trade-off: 4 button cap is hard.

### 4.3 Button visual spec

| Property | Value | Source |
|---|---|---|
| Icon foreground area | 26 × 26px centered | §2.4 |
| Circle outline | `1.5px solid currentColor`, drawn by CSS not in icon | §2.4 |
| Circle diameter | 44px (touch target ≥ 44px per accessibility minimum) | accessibility |
| Icon color | follows `currentColor`; dark theme = white, light theme = dark gray `#262626` | §2.4 |
| Hover/focus | `background: rgba(255,255,255,0.08)` (dark) / `rgba(0,0,0,0.06)` (light) | derived |
| Tilt-press | inherits global `setupTiltPress()` from BaseLayout — already global on `.wp-tile`. AppBar buttons get class `wp-tile`. | §2.7 |
| Aria | each button: `aria-label="{dict[label_key]}"` in 3 locales | a11y |

### 4.4 More (`⋯`) menu overlay

Trigger: tap on `⋯` button.

**Animation**: slide-up from below.
- Duration: **250ms** (ControlNormalAnimationDuration, §2.1)
- Easing: `cubic-bezier(0, 0, 0, 1)` (Decelerate, §2.2)
- Transform: `translateY(100%) → translateY(0)`
- Backdrop: same Acrylic recipe as AppBar (§2.9)

**Dismiss**: tap outside menu, or tap `⋯` again, or `Escape` key.
- Animation: reverse — slide-down 167ms (ControlFastAnimationDuration) with Accelerate `cubic-bezier(1, 0, 1, 1)`.

**Content** (vertical stack):
```
┌─────────────────────────────────┐
│ THEME                           │  ← .menu-label (uppercase, ls 0.18em)
│ ┌───────────┐ ┌───────────┐    │
│ │  ☀ LIGHT  │ │  ☾ DARK   │    │  ← 2 toggle tiles, current = aria-pressed
│ └───────────┘ └───────────┘    │
│                                 │
│ ACCENT                          │
│ ● ● ● ●                         │  ← 4 color swatches
│ Cobalt Red Orange Emerald       │  ← label under selected swatch
│                                 │
│ LANGUAGE                        │
│ ┌──┐ ┌──┐ ┌──┐                 │
│ │中│ │粵│ │EN│                 │  ← pivot-tab style
│ └──┘ └──┘ └──┘                 │
│                                 │
│ ─────────────────────────────   │
│ ↗  github · MIT · CC BY-SA      │  ← about row
└─────────────────────────────────┘
```

- Max height: `60vh` (per §2.4 "more than 5 items needs scroll").
- Width: full bar width (matches AppBar width).
- Item count: 4 sections × ~1 row each = under the 5-item threshold; no scroll expected on standard viewports.

### 4.5 Top status strip (slim replacement for current top nav)

The current top nav holds `CANTOPEDIA` brand + theme button + locale switcher. After Phase A:
- Brand wordmark stays at the very top (`24px` tall slim strip — no `data-role="app-bar"` chrome).
- Locale switcher and theme button **move into the More menu** (§4.4) — they're no longer in the strip.
- Strip background: transparent.
- Strip purpose: brand presence only (informational, not interactive beyond the brand link to home).

**Decision rationale**: Brief §1 mentions "标志性侧边标题" (panorama "START / 开始 / 我的厨房"). The slim strip is the minimal placeholder that doesn't conflict with Phase C (panorama big-title) when that lands. Phase C will replace the slim strip with full panorama header.

### 4.6 Acrylic fallback

```css
.app-bar {
  background: rgba(0, 0, 0, 0.85);  /* solid fallback */
}
@supports (backdrop-filter: blur(30px)) or (-webkit-backdrop-filter: blur(30px)) {
  .app-bar {
    backdrop-filter: blur(30px) saturate(125%);
    -webkit-backdrop-filter: blur(30px) saturate(125%);
    background: rgba(0, 0, 0, 0.6);
  }
}
```

Browsers without `backdrop-filter` (older Firefox without flag): degrade to higher-opacity solid background. **Functional but not aesthetic** degradation.

### 4.7 Astro transition persistence

Current top nav uses `transition:persist` to survive `ClientRouter` swaps. The new bottom AppBar **also uses** `transition:persist` for the entire `<nav class="app-bar">` element. The More menu state (open/closed) does **not** persist — closes on every page navigation (matches WP behavior where AppBar menu auto-collapses on page transition).

---

## 5. Phase F: Default Dark + Accent Picker — Detailed Design

### 5.1 Default theme change

**Current** ([BaseLayout.astro:50-64](../../../site/src/layouts/BaseLayout.astro)):
```js
let saved = localStorage.getItem('cantopedia-theme');
if (saved === 'auto') saved = 'light';
const isDark = saved === 'dark';
document.documentElement.classList.toggle('dark-side', isDark);
```

**After**:
```js
let saved = localStorage.getItem('cantopedia-theme');
// First-visit default: dark (WP10 original flavor). Legacy 'auto' also maps to dark.
if (saved === null || saved === 'auto') {
  saved = 'dark';
  localStorage.setItem('cantopedia-theme', 'dark');
}
const isDark = saved === 'dark';
document.documentElement.classList.toggle('dark-side', isDark);
```

**Migration story**: Existing users who never touched the theme button have `cantopedia-theme === null` (or `auto`) — they auto-migrate to dark. Existing users who explicitly chose 'light' stay on light. Users who chose 'dark' stay on dark. **No surprise theme flips for users with explicit preference.**

### 5.2 Dark theme colors (verify against brief)

| Token | Dark value | Light value | Source / rationale |
|---|---|---|---|
| `--t-bg` (page bg) | `#000000` | `#FFFFFF` | brief §🎨 配色方案 (pure black/white) |
| `--t-ink` (primary text) | `#FFFFFF` | `#000000` | brief |
| `--t-ink-dim` (secondary) | `rgba(255,255,255,0.65)` | `rgba(0,0,0,0.65)` | WP10 secondary text opacity |
| `--t-plate` (card bg) | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.04)` | derived |
| `--t-rule` (divider) | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.12)` | derived |
| `--t-appbar-bg` | `rgba(0,0,0,0.6)` | `rgba(255,255,255,0.7)` | §2.9 + 4.1 |

These tokens are already defined in BaseLayout's `<style is:global>` block (existing `--t-*` family). Phase F audits the values, does not rename the tokens.

### 5.3 Accent picker — 4-color palette

Brief lists 4 accents that don't match the WP10 system palette exactly. Mapping:

| Brief name | Brief hex | WP10 system equivalent (§2.8) | Use this hex |
|---|---|---|---|
| 经典蓝 | `#0078D7` (Win10 Desktop) | **Cobalt** `#3E65FF` | `#3E65FF` |
| 番茄红 | `#E81123` (Win10 close btn) | **Red** `#E51400` | `#E51400` |
| 香橙色 | `#F7630C` (Win10 Desktop) | **Orange** `#FA6800` | `#FA6800` |
| Xbox 绿 | `#107C41` (Xbox palette) | **Emerald** `#008A00` | `#008A00` |

**Decision rationale**: Brief picked recognizable names but used Win10 Desktop / Xbox hex values, not WP10 phone values. Since user said "尽可能复现 WP10 Mobile", we override with WP10 system palette hex while keeping the brief's naming intent ("classic blue / tomato red / orange / Xbox green"). User can override in spec review.

### 5.4 Accent CSS variable

New CSS variable:
```css
:root {
  --accent: #3E65FF;        /* Cobalt — default */
  --accent-fg: #FFFFFF;     /* contrast text on accent */
}
:root[data-accent="red"]     { --accent: #E51400; }
:root[data-accent="orange"]  { --accent: #FA6800; }
:root[data-accent="emerald"] { --accent: #008A00; }
:root[data-accent="cobalt"]  { --accent: #3E65FF; }
```

### 5.5 Accent application scope

Components that **switch to `var(--accent)`**:
- `.app-bar` active-state ring on currently active section (subtle 2px bottom-line under home/search/random/more when on that route)
- Active locale tab in More menu
- AppList letter headers (`.app-list-letter` — currently hardcoded `var(--m-red)`)
- Featured tile label band on hover/active
- Loading bar color (currently inferred)
- View Transition name shimmer (if any)

Components that **stay per-category** (locked):
- `cat-tile-v5` background — keeps per-category color via [categoryColors.ts](../../../site/src/lib/categoryColors.ts). Brief preserves this through the wording "分类瓷块，背景为主题色" but the implementation already treats category color as orthogonal to user accent.
- `stat-tile-mt` — keeps per-stat color (green/orange/steel/red, see [Hub.astro:236-251](../../../site/src/components/Hub.astro)).
- `util-tile` — keeps per-utility color (cyan/yellow/purple/ink).

**Why locked**: brief's "主题色 Accent" is a single per-user preference. The Hub's existing visual variety comes from per-category and per-stat coloring. Those are content-derived, not user-preference-derived. Conflating them would flatten the Hub to single-color tiles.

### 5.6 Accent persistence

```js
// Reads: same SPA-persist pattern as theme
const savedAccent = localStorage.getItem('cantopedia-accent') ?? 'cobalt';
document.documentElement.setAttribute('data-accent', savedAccent);

// Writes: in More menu accent swatch click
function applyAccent(name) {
  document.documentElement.setAttribute('data-accent', name);
  localStorage.setItem('cantopedia-accent', name);
  // update aria-pressed on swatches
}

// SPA-swap: like theme, copy data-accent to incoming doc
document.addEventListener('astro:before-swap', (e) => {
  const accent = document.documentElement.getAttribute('data-accent');
  if (accent) e.newDocument.documentElement.setAttribute('data-accent', accent);
});
```

---

## 6. Per-page Impact Assessment

| Page | Impact | Action |
|---|---|---|
| `[locale]/index.astro` (Hub home) | `main` padding-bottom +88px. Hub itself uses `height: calc(100vh - 120px)` ([Hub.astro:410](../../../site/src/components/Hub.astro)) — needs recalc to `calc(100vh - 72px - 24px)` = `calc(100vh - 96px)` to account for new AppBar instead of old top nav. | Update Hub.astro height formula |
| `[locale]/browse/[category]` | Uses same Hub component | inherits Hub fix |
| `[locale]/all` | Uses AppListPanel inside Hub | inherits Hub fix |
| `[locale]/dishes/[id]` | PivotPage layout, no fixed-height container; just padding-bottom | inherits BaseLayout padding |
| `[locale]/sauces/[id]`, `ingredients/[id]` | normal page flow | inherits BaseLayout padding |
| `[locale]/search` | normal page | inherits BaseLayout padding |
| `404.astro` | normal page | inherits BaseLayout padding |

### Critical: Hub height calculation

[Hub.astro:410](../../../site/src/components/Hub.astro) currently uses `height: calc(100vh - 120px)` — the `120px` accounts for old top nav (~64px) + hub-pivot title strip (~56px). After Phase A:
- Old top nav: 0px (gone)
- New top status strip: 24px (slim brand)
- hub-pivot title strip: unchanged ~56px
- New bottom AppBar: 72px

New formula: `height: calc(100vh - 24px - 56px - 72px)` = `calc(100vh - 152px)`.

This is a single-line change in Hub.astro but is **the most likely regression risk** in Phase A+F (horizontal scroll-snap break if formula is off).

---

## 7. Data Flow

### 7.1 LocalStorage keys

| Key | Values | Read by | Written by |
|---|---|---|---|
| `cantopedia-theme` | `'light'` \| `'dark'` | inline head script (FOIT guard), More menu | More menu theme tile click |
| `cantopedia-accent` (new) | `'cobalt'` \| `'red'` \| `'orange'` \| `'emerald'` | inline head script, More menu | More menu accent swatch click |
| `cantopedia-last-dish` | dish id | `[locale]/dishes/[id].astro:337` | dish detail visit |

### 7.2 ClientRouter swap lifecycle

```
astro:before-preparation → teardown Featured tile interval + Hub nav listeners + More menu state
astro:before-swap        → copy .dark-side class + data-accent attr to incoming doc
astro:after-swap         → boot Featured tile + Hub nav
astro:page-load          → refresh aria-pressed on theme buttons, accent swatches, locale tabs
```

Existing pattern is preserved; Phase A+F only **adds** accent attribute to the swap-copy step.

---

## 8. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| LocalStorage disabled / Safari private mode | Try/catch silently fails (existing pattern in BaseLayout). User gets default dark + cobalt, no persistence across reloads. |
| Browser without `backdrop-filter` | AppBar falls back to higher-opacity solid (§4.6). Functional. |
| Browser without View Transitions (e.g. Firefox) | Already handled by existing code (cross-fade fallback in ClientRouter). |
| Reduced motion preference | Slide-up menu animation respects `@media (prefers-reduced-motion: reduce)` → instant show/hide. Existing Hub respect ([Hub.astro:454-462](../../../site/src/components/Hub.astro)). |
| Mobile viewport with on-screen keyboard | AppBar `position: fixed` may overlap on-screen keyboard on iOS Safari. Acceptable — search and other text-input flows are on dedicated pages where AppBar can hide. **Out of scope**: AppBar hide-on-keyboard logic (defer to follow-up if needed). |
| Very narrow viewport (<320px) | AppBar buttons compress; icons stay 26×26 but circle outline shrinks proportionally. Test at 320px in Playwright probe. |
| Print stylesheet | `@media print { .app-bar, .top-strip { display: none } }` |

---

## 9. Testing Plan

### 9.1 Playwright probes (in `site/scripts/`)

Three new probes mirror existing `_probe-*.mjs` style:

**`_probe-appbar-acrylic.mjs`** — verifies:
- AppBar exists at `bottom: 0`, height 72px
- 4 buttons present with correct aria-labels in zh/yue/en
- `backdrop-filter` computed style is `blur(30px) saturate(125%)` on supporting browsers
- Tilt-press class `wp-tile` applies; pointerdown triggers `pressing` class

**`_probe-more-menu.mjs`** — verifies:
- Tap `⋯` opens menu with `transform: translateY(0)` after 250ms
- Menu contains theme tiles, accent swatches, locale tabs
- Tap accent swatch updates `<html data-accent>` and localStorage
- Tap outside or `Escape` closes menu (animation reverses in 167ms)

**`_probe-dark-default.mjs`** — verifies:
- Fresh visit (localStorage cleared): html has `dark-side` class
- LocalStorage now contains `cantopedia-theme: dark`
- All Hub tile contrasts pass WCAG AA (4.5:1) — uses `axe-core` if convenient, else `getComputedStyle` ratio check

### 9.2 Manual smoke

After implementation, manually verify in dev server (`pnpm dev` or `npm run dev`):
1. First load in clean Chrome → dark + cobalt
2. Switch to light → reload → stays light
3. Switch accent → navigate to a dish → accent persists
4. Hub horizontal scroll-snap still works (regression check on Hub height formula)
5. View Transition tile-to-page morph still works
6. Featured tile slide-up still works
7. Cat-tile 3D card-flip still works
8. AppBar buttons feel tilt-press on tap

### 9.3 Cross-browser

- Chrome (primary): full Acrylic
- Safari: full Acrylic (with -webkit- prefix)
- Firefox: solid fallback (no backdrop-filter without flag) — visual degradation acceptable

---

## 10. Out of Scope (deferred to later specs)

| Phase | Scope | Why deferred |
|---|---|---|
| B | Detail page nutrition Donut + Checkbox ingredients | Requires new data schema (nutrition_per_serving) on Dish content collection — separate concern. |
| C | Panorama big-title ("START / 我的厨房") | Replaces the slim top strip from §4.5. Visual-only, no architecture coupling. |
| D | AppList left-side jump-list (sticky letter index) | Localized to AppListPanel component. |
| E | Kitchen timer tile | New small-utility magnet with Web Audio API + persistence. |
| Hide-AppBar-on-keyboard | iOS Safari keyboard overlap | Polish item, no functional break. |
| Featured tile slide-left mode | Brief mentions both slide-up and slide-left | Current slide-up works; alternate direction is cosmetic. |
| 厨房计时器小工具 magnetic notification queue | WP8.1 §2.6 notification queue is server-driven; out of static site scope | n/a |

---

## 11. Resolved Decisions

User delegated ratification 2026-05-26 ("后面审批按照你的决策同意"). The following decisions were taken on user's behalf and are binding for implementation:

1. **Accent palette**: Use WP10 system palette hex (Cobalt `#3E65FF` / Red `#E51400` / Orange `#FA6800` / Emerald `#008A00`), **NOT** brief's Win10 Desktop hex. Rationale: user's "尽可能复现 WP10 Mobile" requirement overrides brief's naming.
2. **Default accent**: **Cobalt** `#3E65FF`. WP10's western-market default; provides contrast against existing red-toned letter headers (which migrate to `var(--accent)` anyway).
3. **More menu width**: **Full-bar width** (left:0; right:0). Matches WP AppBar menu pop-up convention; narrower popover wastes mobile screen space.
4. **Random button**: **Fully random across all 66 dishes**. The "骰子" metaphor in brief is about discovery; same-category browsing is already covered by the 8 category panels.
5. **Top strip**: **Retain 24px slim brand strip** until Phase C lands the panorama header. Brand presence is a basic identity requirement; the strip is the minimal placeholder.

If any decision proves wrong during implementation, surface it before merging Phase A+F.

---

## 12. Source Index

Microsoft official documentation cited in this spec:
- [Timing and easing — UWP/WinUI](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing)
- [Motion in practice](https://learn.microsoft.com/en-us/windows/apps/develop/motion/motion-in-practice)
- [The Windows Phone Application Bar — MSDN archive](https://learn.microsoft.com/en-us/archive/blogs/amar/the-windows-phone-application-bar)
- [Working with the Windows Phone Application Bar — VS Magazine](https://visualstudiomagazine.com/articles/2012/03/30/windows-phone-application-bar.aspx)
- [Pivot — Microsoft Learn](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pivot)
- [Pivot and Hub Controls Design Guidelines](https://learn.microsoft.com/en-us/archive/technet-wiki/24035.pivot-and-hub-controls-design-guidelines)
- [Windows Phone 8.1 Live Tiles — MSDN archive](https://learn.microsoft.com/en-us/archive/blogs/thunbrynt/windows-phone-8-1-for-developerslive-tiles)
- [Tilt effect for Windows Phone controls — MSDN archive](https://learn.microsoft.com/en-us/archive/blogs/ptorr/tilt-effect-for-windows-phone-controls)
- [Themes and accent colors — Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/dn772323(v=vs.85))
- [DIY Acrylic Material — Microsoft Design (Medium)](https://medium.com/microsoft-design/diy-a-web-version-the-fluent-design-systems-acrylic-material-fe2eac2a40bb)
- [Segoe UI font family](https://learn.microsoft.com/en-us/typography/font-list/segoe-ui)
