# WP10 Metro Refresh — Implementation Plan (v2, detailed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task is self-contained — a subagent dispatched with just one task description, the spec, and this plan should be able to complete and commit it.

**Goal:** Restore WP10 "alive" feel via 5 hand-crafted motion features + 1 Fluent borrow + 3 missing components, with a per-language typography framework. SOLID applied throughout the new code.

**Architecture:** Astro 5 static site, vanilla TypeScript (no UI frameworks). Motion logic split into single-responsibility modules under `site/src/lib/motion/`. i18n typography is one block of CSS variables in `BaseLayout`'s global style, keyed on `html[lang="..."]`. Optional MetroUI 5 CSS for component baselining — gated on Task 0 spike outcome.

**Tech Stack:** Astro 5, vanilla TypeScript, CSS custom properties keyed on `[lang]`, View Transitions API, `prefers-reduced-motion`, Google Fonts (adding Noto Sans HK / Noto Serif HK), `requestAnimationFrame`.

**Spec:** [docs/superpowers/specs/2026-05-25-wp10-metro-refresh-design.md](../specs/2026-05-25-wp10-metro-refresh-design.md)

---

## Decomposition principle (SOLID)

- **Single Responsibility (S):** Each file does one thing. `parallax.ts` only does parallax — not reveal, not live tile. `Toast.astro` only does toast — not tooltip.
- **Open/Closed (O):** Extension via CSS custom properties and data attributes, not by editing source files. Adding a 4th language = one new `html[lang="..."]` block. Adding parallax to a new page = adding `data-parallax="0.4"` attribute, no JS change.
- **Liskov (L):** All `init*()` functions in motion modules have the same shape (`(): void`, idempotent, ClientRouter-safe). Interchangeable.
- **Interface Segregation (I):** Components accept minimal, focused props. `Toast` takes nothing (global trigger). `Tooltip` takes `text` + optional `position`. `Accordion` takes `title` + optional `open`.
- **Dependency Inversion (D):** Pages and BaseLayout depend on the `initMotion()` abstraction in `motion/index.ts`, not on concrete `addEventListener` calls. Swap `parallax.ts` implementation, callers unchanged.

---

## File map

| Path | Status | Responsibility |
|---|---|---|
| [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) | Modify | MetroUI CDN (conditional); spring vars; multi-layer Acrylic; mount motion modules; embed i18n typography vars; load HK fonts |
| `site/src/lib/motion/parallax.ts` | Create | Parallax on `[data-parallax]` (SRP) |
| `site/src/lib/motion/reveal.ts` | Create | Reveal highlight on `.wp-tile` (SRP) |
| `site/src/lib/motion/liveTile.ts` | Create | Stagger live-tile flip delays (SRP) |
| `site/src/lib/motion/index.ts` | Create | `initMotion()` composition root |
| [site/src/pages/[locale]/index.astro](../../site/src/pages/%5Blocale%5D/index.astro) | Modify | Wrap 4 stats tiles in flip structure; flip-face CSS |
| [site/src/pages/[locale]/dishes/[id].astro](../../site/src/pages/%5Blocale%5D/dishes/%5Bid%5D.astro) | Modify | `.kb` class on hero `<img>`; `data-parallax="0.35"` on `.hero-band` |
| [site/src/pages/[locale]/sauces/[id].astro](../../site/src/pages/%5Blocale%5D/sauces/%5Bid%5D.astro) | None (no hero photo currently) | Skip |
| `site/src/components/Toast.astro` | Create | Global toast via `cantopediaToast(msg)` |
| `site/src/components/Tooltip.astro` | Create | Pure-CSS hover tooltip |
| `site/src/components/Accordion.astro` | Create | `<details>` accordion |
| `docs/handoff/2026-05-25-wp10-refresh-done.md` | Create at end | Completion report |

---

## Subagent dispatch context (give to every subagent)

Every subagent gets this preamble plus its single task:

> You are implementing one task from `docs/superpowers/plans/2026-05-25-wp10-metro-refresh.md` for the Cantopedia repo. Working dir: `d:\Cantonese Cuisine`.
>
> Conventions:
> - Edit files in `site/src/`. Build with `pnpm build` from `site/`. Dev with `pnpm dev`.
> - Use `Edit` for existing files, `Write` for new files. Don't re-read files you just edited.
> - All commits include the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` line.
> - Don't `git push` — the orchestrator pushes after all tasks land.
> - End the task with one git commit containing only that task's changes.
> - If you discover the spec or plan contradicts itself, STOP and report — do not improvise.

---

## Task 0 — MetroUI 5 spike (GATE)

**Purpose:** Decide whether to depend on MetroUI 5 CSS for component baselines.

**Files touched:** [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) (temporary edit, reverted if spike fails); `site/src/pages/spike-metroui.astro` (temporary, deleted at end).

**Inputs to subagent:** none beyond context preamble.

**Output / artifact:** Commit `spike: MetroUI 5 — <PASS|FAIL> <one-line reason>`. Updates the plan file's Task 0 outcome line.

**Verification:** described inline below.

- [ ] **Step 1: Probe CDN URLs**

```bash
curl -sI "https://cdn.jsdelivr.net/npm/@olton/metroui@latest/dist/metroui.css" | head -2
curl -sI "https://cdn.jsdelivr.net/npm/metroui@latest/dist/metro.css" | head -2
curl -sI "https://cdn.jsdelivr.net/npm/metro4@latest/build/css/metro-all.min.css" | head -2
```

Pick the first URL returning `HTTP/2 200`. Record it as `<METROUI_URL>` for next step.

- [ ] **Step 2: Add CDN link temporarily**

In [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), find the line containing `<ClientRouter />` inside `<head>`. Insert immediately above it:

```html
    <link rel="stylesheet" href="<METROUI_URL>" data-spike="metroui" />
```

- [ ] **Step 3: Create scratch test page**

Create `site/src/pages/spike-metroui.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
---
<BaseLayout title="MetroUI Spike" locale="zh">
  <h2>Tile sample</h2>
  <div class="tile" style="width: 120px; height: 120px; background: var(--m-blue); color: #fff; padding: 12px;">
    <div class="tile-content">.tile</div>
  </div>
  <h2>Accordion sample</h2>
  <div class="accordion">
    <div class="frame">
      <div class="heading">Heading</div>
      <div class="content">Content body</div>
    </div>
  </div>
  <h2>Toast sample</h2>
  <div class="toast">.toast text</div>
</BaseLayout>
```

- [ ] **Step 4: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -10
```

PASS criterion: build succeeds, no errors mentioning `spike-metroui` or MetroUI.

- [ ] **Step 5: Dev-server visual check**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm dev
```

In browser open:
1. `http://localhost:4321/cantopedia/zh` — existing home unchanged?
2. `http://localhost:4321/cantopedia/spike-metroui` — three samples render with *some* MetroUI styling?
3. Toggle dark mode via drawer — does it still work site-wide?
4. Browser console — any errors mentioning MetroUI?

Stop dev server with Ctrl+C.

- [ ] **Step 6: Decision**

- **PASS** if all four checks above pass: keep `<link>` in BaseLayout, remove `data-spike="metroui"` attribute. Toast/Accordion components in later tasks **may** use MetroUI classes as base.
- **FAIL** if any check fails: remove the `<link>` from BaseLayout entirely. Toast/Accordion components are fully hand-written (Task 9/11 already work either way — they don't depend on MetroUI).

- [ ] **Step 7: Clean up and commit**

```bash
rm "d:/Cantonese Cuisine/site/src/pages/spike-metroui.astro"
cd "d:/Cantonese Cuisine" && git add -A && git commit -m "spike: MetroUI 5 — <PASS or FAIL> <one-line reason>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 1 — i18n typography framework

**Purpose:** Establish per-language typography variables in one CSS block; switch headings/body to use them.

**Files touched:** [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro).

**Why this comes first:** Subsequent tasks add new visual elements (live tile flip, accordion, toast). Those should inherit from the language-typography vars, not bake in their own font sizes. Establishing the framework first means later tasks don't need backfill edits.

**Inputs:** none.

**Output:** Commit `i18n: per-language typography framework — html[lang] keyed CSS variables`.

**Verification:** Build green; open en/zh/yue locales side-by-side; English headings visibly larger than Chinese; text fluency unchanged.

- [ ] **Step 1: Add HK fonts to Google Fonts URL**

In [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), find the `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` line. Replace it with the URL augmented to include Noto Sans HK + Noto Serif HK:

```html
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600&family=Noto+Sans+SC:wght@200;300;400;500;700&family=Noto+Sans+HK:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Serif+HK:wght@400;500;700&family=Open+Sans:wght@200;300;400;600;700&display=swap" />
```

- [ ] **Step 2: Add i18n typography vars block inside `:root`**

Inside the existing `:root { ... }` (around line 343), after the existing type-stack definitions (`--sans`, `--sans-zh`, ...), append:

```css
  /* Per-language typography defaults (overridden by html[lang="..."] selectors below).
     Pages should consume these vars in headings/body instead of hard-coding sizes. */
  --lang-font-primary: var(--sans), var(--sans-zh);
  --lang-font-serif:   var(--serif-en), var(--serif-zh);
  --lang-h1-size: 3rem;
  --lang-h2-size: 2rem;
  --lang-h3-size: 1.25rem;
  --lang-body-leading: 1.65;
  --lang-h1-tracking: -0.025em;
  --lang-h2-tracking: -0.015em;
  --lang-min-weight: 200;
  --lang-font-size-adjust: 0.5;
  --lang-line-break: normal;
```

- [ ] **Step 3: Add `html[lang="..."]` overrides outside `:root`, before the existing `html, body` rule**

In the same `<style is:global>` block, find the existing `html, body { background: ...` rule. Immediately before it, insert:

```css
      /* ===== i18n typography overrides ===== */
      html[lang="en"] {
        --lang-font-primary: "Segoe UI", "Open Sans", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
        --lang-font-serif: "Crimson Pro", "Iowan Old Style", Georgia, serif;
        --lang-h1-size: 3rem;
        --lang-h2-size: 2rem;
        --lang-body-leading: 1.65;
        --lang-h1-tracking: -0.025em;
        --lang-h2-tracking: -0.015em;
        --lang-min-weight: 200;
        --lang-font-size-adjust: 0.5;
        --lang-line-break: normal;
      }
      html[lang="zh-Hant"] {
        --lang-font-primary: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
        --lang-font-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
        --lang-h1-size: 2.4rem;
        --lang-h2-size: 1.65rem;
        --lang-body-leading: 1.55;
        --lang-h1-tracking: 0.005em;
        --lang-h2-tracking: 0.005em;
        --lang-min-weight: 300;
        --lang-font-size-adjust: 0.55;
        --lang-line-break: strict;
      }
      html[lang="yue-Hant"] {
        --lang-font-primary: "Noto Sans HK", "Microsoft JhengHei", "PingFang HK", "Noto Sans SC", sans-serif;
        --lang-font-serif: "Noto Serif HK", "Noto Serif SC", "Source Han Serif HK", serif;
        --lang-h1-size: 2.4rem;
        --lang-h2-size: 1.65rem;
        --lang-body-leading: 1.55;
        --lang-h1-tracking: 0.005em;
        --lang-h2-tracking: 0.005em;
        --lang-min-weight: 300;
        --lang-font-size-adjust: 0.55;
        --lang-line-break: strict;
      }
```

- [ ] **Step 4: Re-point existing headings/body to consume the lang vars**

Find the existing global rules for `body`, `h1`, `h2`, `h3`. Replace them with:

```css
      body {
        font-family: var(--lang-font-primary);
        font-size: 16px;
        line-height: var(--lang-body-leading);
        font-size-adjust: var(--lang-font-size-adjust);
        line-break: var(--lang-line-break);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      h1 { font-family: var(--lang-font-primary); font-weight: var(--lang-min-weight, 300); font-size: var(--lang-h1-size); line-height: 1.1; letter-spacing: var(--lang-h1-tracking); margin: 0 0 0.5rem; }
      h2 { font-family: var(--lang-font-primary); font-weight: var(--lang-min-weight, 300); font-size: var(--lang-h2-size); margin: 2.5rem 0 1rem; line-height: 1.2; letter-spacing: var(--lang-h2-tracking); }
      h3 { font-family: var(--lang-font-primary); font-weight: 500; font-size: var(--lang-h3-size); text-transform: none; letter-spacing: 0.01em; color: var(--ink); margin: 2rem 0 0.75rem; }
      h4 { font-family: var(--lang-font-primary); font-weight: 500; font-size: 1.0625rem; margin: 1.25rem 0 0.5rem; letter-spacing: 0.01em; }
```

Delete the sharper-typography duplicate rules:

```css
      /* Sharper typography hierarchy — more WP10 (extreme weight contrast) */
      h1 { font-weight: 300; letter-spacing: -0.025em; }
      h2 { font-weight: 300; letter-spacing: -0.015em; }
```

(These are now superseded by the lang-driven `var(--lang-h1-tracking)` etc. Letter-spacing is per-language.)

- [ ] **Step 5: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -8
```

Expected: build succeeds.

- [ ] **Step 6: Visual smoke (three locales)**

Run dev server. Open in three tabs and compare H1:

- `http://localhost:4321/cantopedia/en` — English H1 large (3rem ≈ 48px)
- `http://localhost:4321/cantopedia/zh` — Chinese H1 smaller (2.4rem ≈ 38px), visually balanced
- `http://localhost:4321/cantopedia/yue` — Cantonese H1 same as Chinese, but font should switch to Noto Sans HK (devtools → inspect H1 → Computed → font-family should list "Noto Sans HK" first)

Body paragraphs in zh/yue should look slightly tighter than en (line-height 1.55 vs 1.65).

- [ ] **Step 7: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "i18n: per-language typography framework — html[lang] keyed CSS variables

Adds --lang-* CSS vars on html[lang=en|zh-Hant|yue-Hant] selectors. English
headings stay at 3rem; Chinese/Cantonese scale to 2.4rem (80%) to compensate
for square hanzi visual weight. Adds Noto Sans HK / Noto Serif HK to the
Google Fonts URL so yue pages get region-appropriate glyphs. Body fonts,
line-height, letter-spacing, font-size-adjust, and minimum weight all
adjust per language. Headings now consume these vars instead of literals.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — M1: Spring easing globally

**Purpose:** Replace damped curves with WP10-signature spring (slight overshoot then settle).

**Files touched:** [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro).

**Inputs:** none.

**Output:** Commit `M1: spring easing — tile press releases with WP10 overshoot`.

**Verification:** Press a category tile, release; tile bounces slightly past 1.0 scale before settling.

- [ ] **Step 1: Locate easing var block**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), find the existing block around line 402-410:

```css
        --fluent-curve-decelerate-mid: cubic-bezier(0.16, 1, 0.3, 1);
        --fluent-curve-accelerate-mid: cubic-bezier(0.55, 0, 0.9, 0.3);
        --fluent-curve-easy-ease:      cubic-bezier(0.4, 0, 0.2, 1);
        --fluent-curve-spring:         cubic-bezier(0.34, 1.4, 0.55, 1);
        --fluent-duration-fast:        180ms;
        --fluent-duration-normal:      280ms;
        --fluent-duration-gentle:      420ms;
        --fluent-duration-rich:        560ms;
```

- [ ] **Step 2: Strengthen and split the spring curves**

Replace with:

```css
        /* WP10 spring family — slight overshoot then settle. Microsoft Lumia
           "Continuum" used bezier(0.1, 0.9, 0.2, 1.15) for tile press, ~ease-out
           with overshoot for pivot. We keep two springs (strong for tile release,
           soft for content enter) plus a non-bouncy decel for page/drawer slide. */
        --fluent-curve-decelerate-mid: cubic-bezier(0.16, 1, 0.3, 1);
        --fluent-curve-accelerate-mid: cubic-bezier(0.55, 0, 0.9, 0.3);
        --fluent-curve-easy-ease:      cubic-bezier(0.4, 0, 0.2, 1);
        --fluent-curve-spring:         cubic-bezier(0.34, 1.56, 0.64, 1);
        --fluent-curve-spring-soft:    cubic-bezier(0.22, 1.2, 0.36, 1);
        --fluent-curve-tile-press:     cubic-bezier(0.1, 0.9, 0.2, 1.15);
        --fluent-duration-fast:        180ms;
        --fluent-duration-normal:      280ms;
        --fluent-duration-gentle:      420ms;
        --fluent-duration-rich:        560ms;
```

- [ ] **Step 3: Update tile-press transition**

Find:

```css
      .wp-tile.pressing {
        transform: perspective(800px)
                   rotateX(var(--tilt-x))
                   rotateY(var(--tilt-y))
                   scale(0.96);
        transition: transform 140ms cubic-bezier(0.4, 0.05, 0.6, 0.95);
      }
```

Replace the `transition` line with:

```css
        transition: transform 140ms var(--fluent-curve-tile-press);
```

- [ ] **Step 4: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 5: Visual smoke**

Dev server → home → click and release a category tile. Watch for slight overshoot on release (tile briefly scales past 1.0 before settling). If unchanged, double-check `.wp-tile` transition is also using `var(--fluent-curve-spring)` (it already is, in the existing `.wp-tile { transition: transform 380ms var(--fluent-curve-spring); }` rule).

- [ ] **Step 6: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "M1: spring easing — tile press releases with WP10 overshoot

Splits the spring family into three curves (strong, soft, tile-press) and
swaps the tile-press transition onto the new curve. Adds a slight overshoot
matching the WP10 Continuum tile feel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — M2: Ken Burns on hero images

**Purpose:** Hero photos slowly drift + zoom over 20s, alternating direction, never static.

**Files touched:** [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), [site/src/pages/[locale]/dishes/[id].astro](../../site/src/pages/%5Blocale%5D/dishes/%5Bid%5D.astro).

**Inputs:** none.

**Output:** Commit `M2: Ken Burns on dish hero photos`.

**Verification:** Open any dish page with photo; hero `<img>` is slowly scaling/translating; switching between dishes shows alternate directions.

- [ ] **Step 1: Add Ken Burns keyframes**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), inside `<style is:global>`, after the `@keyframes wp-loading { ... }` rule, append:

```css
      /* ===== Ken Burns: slow drift + zoom for hero photos =====
         22s cycle, alternates direction. Disable for reduced-motion. */
      @keyframes ken-burns-a {
        0%   { transform: scale(1.00) translate(0, 0); }
        50%  { transform: scale(1.06) translate(-2%, -1.5%); }
        100% { transform: scale(1.00) translate(0, 0); }
      }
      @keyframes ken-burns-b {
        0%   { transform: scale(1.04) translate(1.5%, 1%); }
        50%  { transform: scale(1.00) translate(-1%, -1%); }
        100% { transform: scale(1.04) translate(1.5%, 1%); }
      }
      .kb {
        animation: ken-burns-a 22s ease-in-out infinite;
        will-change: transform;
      }
      .kb.kb-b { animation-name: ken-burns-b; }
      @media (prefers-reduced-motion: reduce) {
        .kb { animation: none; transform: scale(1.03); }
      }
```

- [ ] **Step 2: Apply `.kb` class to dish hero `<img>`**

In [dishes/[id].astro](../../site/src/pages/%5Blocale%5D/dishes/%5Bid%5D.astro), find:

```astro
      <img class="hero-photo" src={commonsThumb(dish.data.images[0].path, 1400)} alt={`${dish.data.names.yue_hant} · ${dish.data.names.en}`} loading="eager" decoding="async" />
```

Replace `class="hero-photo"` with:

```astro
class={`hero-photo kb ${(dish.data.menu_no % 2 === 0) ? 'kb-b' : ''}`}
```

Rationale: `menu_no % 2` deterministically splits dishes between A/B directions, so navigating between adjacent dishes shows variety.

- [ ] **Step 3: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Visual smoke**

Dev → open a dish page with a photo (e.g. `/cantopedia/zh/dishes/<some-id-with-image>`). Watch hero for 5 seconds — visible drift/zoom. Navigate to next dish — different drift direction.

Enable "Emulate prefers-reduced-motion: reduce" in devtools → reload → photo stops animating but is still slightly zoomed (1.03 scale).

- [ ] **Step 5: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro site/src/pages/[locale]/dishes/[id].astro
git commit -m "M2: Ken Burns on dish hero photos

Two keyframe variants (A drift up-left, B drift down-right) alternated by
menu_no parity, 22s cycle. Disabled when prefers-reduced-motion: reduce.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — M3: Multi-layer Acrylic on drawer + nav

**Purpose:** Replace single-layer blur with stacked blur + saturation + film-grain noise, giving Acrylic visible depth.

**Files touched:** [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro).

**Inputs:** none.

**Output:** Commit `M3: multi-layer Acrylic — blur + saturation + noise on drawer/nav`.

**Verification:** Drawer open shows visible film-grain texture over the blur. Status bar at top has subtle noise. Firefox (no `backdrop-filter`) still falls back to solid surface.

- [ ] **Step 1: Add noise SVG data URI to `:root`**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), inside `:root { ... }`, append at the end (before closing `}`):

```css
        /* Subtle film grain noise for Acrylic — generated with feTurbulence. */
        --acrylic-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>");
```

- [ ] **Step 2: Layer drawer Acrylic**

Find the `.nav-drawer { ... }` block. Replace its `background` and `backdrop-filter` lines with the multi-layer stack:

Locate:

```css
      .nav-drawer {
        position: fixed; top: 0; bottom: 0; left: 0;
        width: clamp(260px, 78vw, 320px);
        background: var(--t-drawer-bg);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
```

Change those three lines to:

```css
      .nav-drawer {
        position: fixed; top: 0; bottom: 0; left: 0;
        width: clamp(260px, 78vw, 320px);
        background: var(--acrylic-noise), var(--t-drawer-bg);
        background-blend-mode: overlay, normal;
        backdrop-filter: blur(28px) saturate(180%) brightness(1.05);
        -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(1.05);
```

Also update the `box-shadow` line a few rows down from `box-shadow: 2px 0 16px rgba(0,0,0,0.35);` to:

```css
        box-shadow: 2px 0 24px rgba(0,0,0,0.45);
```

- [ ] **Step 3: Subtle noise on status bar**

Find:

```css
      .metro-nav {
        background: #000;
```

Replace just the `background:` line with:

```css
        background: #000 var(--acrylic-noise);
        background-blend-mode: overlay;
```

Also find:

```css
      html[data-theme="light"] .metro-nav { background: #1d1d1d; }
```

Replace with:

```css
      html[data-theme="light"] .metro-nav { background: #1d1d1d var(--acrylic-noise); background-blend-mode: overlay; }
```

- [ ] **Step 4: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 5: Visual smoke**

Dev → open site → tap hamburger to open drawer. Drawer surface should show subtle film grain (zoom in to see — texture density is per-pixel). Top status bar should have a barely-visible noise pattern.

Test Firefox: drawer should fall back to solid `--t-acrylic-fallback` since `backdrop-filter` is gated by `@supports` (existing fallback rule).

- [ ] **Step 6: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "M3: multi-layer Acrylic — blur + saturation + noise on drawer/nav

Adds a single inline noise SVG data URI as --acrylic-noise, layered over
drawer and nav backgrounds with mix-blend-mode: overlay. Drawer also gains
brightness(1.05) and a stronger shadow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Motion module scaffolding (SRP)

**Purpose:** Create the three single-responsibility motion modules and the composition root. No integration with pages yet — that comes in subsequent tasks. Establishing modules first lets later tasks just `import { initFoo }` instead of weaving JS inline.

**Files touched:** create `site/src/lib/motion/parallax.ts`, `site/src/lib/motion/reveal.ts`, `site/src/lib/motion/liveTile.ts`, `site/src/lib/motion/index.ts`. Modify [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) to import and call `initMotion()` on page load.

**Inputs:** none.

**Output:** Commit `motion: scaffold SRP modules — parallax / reveal / liveTile + composition root`.

**Verification:** Build succeeds; `initMotion()` is called on `astro:page-load`; no parallax/reveal/live-tile elements exist yet so calls are no-ops.

- [ ] **Step 1: Create parallax module**

Create `site/src/lib/motion/parallax.ts`:

```typescript
// Parallax — scroll-driven background translation for [data-parallax] targets.
// Single responsibility: only does parallax, nothing else. Idempotent and
// ClientRouter-safe — re-init after navigation is a no-op if nothing changed.

const WIRED_KEY = '__motionParallaxWired';

export function initParallax(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (targets.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const update = (): void => {
    const y = window.scrollY;
    targets.forEach((el) => {
      const rate = parseFloat(el.dataset.parallax ?? '0.4');
      const photo = el.querySelector<HTMLElement>('.hero-photo');
      if (photo) {
        photo.style.transform = `translate3d(0, ${y * rate}px, 0) scale(1.04)`;
      }
    });
    ticking = false;
  };

  const onScroll = (): void => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  if (!(window as any)[WIRED_KEY]) {
    window.addEventListener('scroll', onScroll, { passive: true });
    (window as any)[WIRED_KEY] = true;
  }
  update();
}
```

- [ ] **Step 2: Create reveal module**

Create `site/src/lib/motion/reveal.ts`:

```typescript
// Reveal highlight — pointer-tracked radial glow on .wp-tile / .reveal.
// Single responsibility. Sets --reveal-x / --reveal-y CSS vars on the
// hovered element; CSS does the visual via ::before radial-gradient.

const WIRED_KEY = '__motionRevealWired';

export function initReveal(): void {
  if ((document as any)[WIRED_KEY]) return;
  (document as any)[WIRED_KEY] = true;

  document.addEventListener('pointermove', (e) => {
    const tile = (e.target as Element | null)?.closest<HTMLElement>('.wp-tile, .reveal');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--reveal-x', `${e.clientX - r.left}px`);
    tile.style.setProperty('--reveal-y', `${e.clientY - r.top}px`);
    tile.classList.add('reveal-active');
  });

  document.addEventListener('pointerleave', (e) => {
    const tile = (e.target as Element | null)?.closest<HTMLElement>('.wp-tile, .reveal');
    if (tile) tile.classList.remove('reveal-active');
  }, true);
}
```

- [ ] **Step 3: Create liveTile module**

Create `site/src/lib/motion/liveTile.ts`:

```typescript
// Live tile flip — stagger animation-delay across .live-tile faces.
// Single responsibility. The actual flip animation is defined in CSS;
// this module only computes and applies the delay so adjacent tiles
// flip in turn rather than all at once.

export function initLiveTile(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tiles = document.querySelectorAll<HTMLElement>('.live-tile');
  tiles.forEach((tile, i) => {
    const delay = `${i * 1.8}s`;
    tile.querySelectorAll<HTMLElement>('.live-tile-face').forEach((face) => {
      face.style.animationDelay = delay;
    });
  });
}
```

- [ ] **Step 4: Create composition root**

Create `site/src/lib/motion/index.ts`:

```typescript
// Motion composition root — call initMotion() once per page load to wire
// all motion behaviors. Each module is independently idempotent, so this
// is safe to call repeatedly (e.g. on every astro:page-load).

import { initParallax } from './parallax';
import { initReveal } from './reveal';
import { initLiveTile } from './liveTile';

export function initMotion(): void {
  initParallax();
  initReveal();
  initLiveTile();
}
```

- [ ] **Step 5: Mount in BaseLayout**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), find the `<script>` block starting with `// Drawer + theme — instantiated on every page load`. At the top of that script (right after the `import { createFocusTrap }` line), add:

```typescript
      import { initMotion } from '~/lib/motion';
```

Then find the end of the `setup()` function. Its last existing line should be:

```typescript
        buttons.forEach((b) => b.addEventListener('click', () => applyChoice(b.dataset.themeChoice!)));
      }
```

Before the closing `}`, add `initMotion();` so the function ends:

```typescript
        buttons.forEach((b) => b.addEventListener('click', () => applyChoice(b.dataset.themeChoice!)));
        initMotion();
      }
```

- [ ] **Step 6: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -10
```

Expected: build succeeds. Check the bundle for `motion` — should appear in the JS output.

- [ ] **Step 7: Smoke**

Dev → open any page. Console should be clean. No `[data-parallax]`, `.wp-tile` reveal styles yet (added in later tasks), so functions silently no-op.

- [ ] **Step 8: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/lib/motion/ site/src/layouts/BaseLayout.astro
git commit -m "motion: scaffold SRP modules — parallax / reveal / liveTile + composition root

Three single-responsibility modules under site/src/lib/motion/, each
exporting one init function. Composition root index.ts re-exports
initMotion() which calls all three. BaseLayout calls initMotion() at the
end of setup() (runs both at first load and on every astro:page-load).

Targets and CSS are added in subsequent tasks; for now the calls no-op.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — M4: Panorama parallax integration

**Purpose:** Activate the parallax module on dish hero band.

**Files touched:** [dishes/[id].astro](../../site/src/pages/%5Blocale%5D/dishes/%5Bid%5D.astro).

**Inputs:** Task 5 must be complete (parallax module exists).

**Output:** Commit `M4: panorama parallax on dish hero — 0.35x scroll rate via data-parallax`.

**Verification:** Open dish page, scroll; hero photo appears to "stay" longer than rest of page.

- [ ] **Step 1: Add `data-parallax` attribute to hero band**

In [dishes/[id].astro](../../site/src/pages/%5Blocale%5D/dishes/%5Bid%5D.astro), find:

```astro
  <header class={`hero-band ${dish.data.images?.[0] ? 'has-photo' : ''}`} style={`background: ${catColor}; view-transition-name: dish-${dish.id};`}>
```

Replace with:

```astro
  <header class={`hero-band ${dish.data.images?.[0] ? 'has-photo' : ''}`} data-parallax="0.35" style={`background: ${catColor}; view-transition-name: dish-${dish.id};`}>
```

- [ ] **Step 2: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Smoke**

Dev → open a dish page with a photo → scroll. The photo should drift up at ~0.35x of the page scroll rate (appears to "stay put" while content scrolls past).

Switch dishes via category → confirm parallax re-binds (the `initMotion()` call runs on `astro:page-load`).

- [ ] **Step 4: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/pages/[locale]/dishes/[id].astro
git commit -m "M4: panorama parallax on dish hero — 0.35x scroll rate via data-parallax

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — M5: Live tile flip on home stats

**Purpose:** The 4 home stats tiles flip front/back every 9s on stagger, showing percentage on back face.

**Files touched:** [index.astro](../../site/src/pages/%5Blocale%5D/index.astro). The motion module's stagger logic was already added in Task 5.

**Inputs:** Task 5.

**Output:** Commit `M5: live tile flip — home stats tiles rotate front/back every 9s, staggered`.

**Verification:** Open home, wait 5s. Tiles flip one-by-one. Reduced motion: tiles stay on front face.

- [ ] **Step 1: Wrap each stat tile in flip structure**

In [index.astro](../../site/src/pages/%5Blocale%5D/index.astro), find:

```astro
    <div class="stat-tiles">
      <div class="stat-tile stat-complete">
        <div class="stat-num">{complete}</div>
        <div class="stat-label">{dict.complete}</div>
      </div>
      <div class="stat-tile stat-draft">
        <div class="stat-num">{draft}</div>
        <div class="stat-label">{dict.draft}</div>
      </div>
      <div class="stat-tile stat-stub">
        <div class="stat-num">{total - complete - draft}</div>
        <div class="stat-label">{dict.stub}</div>
      </div>
      <div class="stat-tile stat-total">
        <div class="stat-num">{total}</div>
        <div class="stat-label">{dict.pieces}</div>
      </div>
    </div>
```

Replace with:

```astro
    <div class="stat-tiles">
      <div class="stat-tile stat-complete live-tile">
        <div class="live-tile-face front">
          <div class="stat-num">{complete}</div>
          <div class="stat-label">{dict.complete}</div>
        </div>
        <div class="live-tile-face back">
          <div class="stat-num-small">{Math.round((complete / total) * 100)}%</div>
          <div class="stat-label">{dict.complete}</div>
        </div>
      </div>
      <div class="stat-tile stat-draft live-tile">
        <div class="live-tile-face front">
          <div class="stat-num">{draft}</div>
          <div class="stat-label">{dict.draft}</div>
        </div>
        <div class="live-tile-face back">
          <div class="stat-num-small">{Math.round((draft / total) * 100)}%</div>
          <div class="stat-label">{dict.draft}</div>
        </div>
      </div>
      <div class="stat-tile stat-stub live-tile">
        <div class="live-tile-face front">
          <div class="stat-num">{total - complete - draft}</div>
          <div class="stat-label">{dict.stub}</div>
        </div>
        <div class="live-tile-face back">
          <div class="stat-num-small">{Math.round(((total - complete - draft) / total) * 100)}%</div>
          <div class="stat-label">{dict.stub}</div>
        </div>
      </div>
      <div class="stat-tile stat-total live-tile">
        <div class="live-tile-face front">
          <div class="stat-num">{total}</div>
          <div class="stat-label">{dict.pieces}</div>
        </div>
        <div class="live-tile-face back">
          <div class="stat-num-small">100%</div>
          <div class="stat-label">{dict.pieces}</div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add flip CSS**

In the same file's `<style>` block, append:

```css
  .live-tile {
    position: relative;
    perspective: 800px;
    overflow: hidden;
  }
  .live-tile-face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    padding: inherit;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform-style: preserve-3d;
    animation: tile-flip-front 9s infinite;
  }
  .live-tile-face.back {
    animation-name: tile-flip-back;
    transform: rotateX(180deg);
  }
  @keyframes tile-flip-front {
    0%, 50%   { transform: rotateX(0deg); }
    60%, 100% { transform: rotateX(-180deg); }
  }
  @keyframes tile-flip-back {
    0%, 50%   { transform: rotateX(180deg); }
    60%, 100% { transform: rotateX(0deg); }
  }
  .stat-num-small {
    font-family: var(--lang-font-primary);
    font-size: 2.5rem;
    font-weight: var(--lang-min-weight, 300);
    letter-spacing: -0.02em;
    color: white;
    line-height: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .live-tile-face { animation: none; }
    .live-tile-face.back { display: none; }
  }
```

Note `--lang-font-primary` and `--lang-min-weight` come from the i18n typography framework (Task 1).

- [ ] **Step 3: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Smoke**

Dev → home. Wait 5s. Each stats tile flips in turn (1.8s apart). Back face shows percentage. Toggle "reduced motion" in devtools — tiles stay on front.

Switch to en/yue locale: back-face number uses correct language font (it's whatever `--lang-font-primary` resolves to on the current page).

- [ ] **Step 5: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/pages/[locale]/index.astro
git commit -m "M5: live tile flip — home stats tiles rotate front/back every 9s, staggered

4 stats tiles get a front (count) + back (percentage) face. Stagger applied
by motion/liveTile.ts (1.8s between adjacent tiles). 9s full cycle. Back
face uses --lang-font-primary so typography follows the active locale.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — F1: Reveal highlight CSS

**Purpose:** Add the CSS for the radial-glow effect (pointer listener already added in Task 5's reveal module).

**Files touched:** [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro).

**Inputs:** Task 5.

**Output:** Commit `F1: Reveal highlight — radial glow follows cursor on .wp-tile`.

**Verification:** Hover a tile — soft white glow tracks the cursor.

- [ ] **Step 1: Add reveal CSS**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), inside `<style is:global>`, append at the very end (before `</style>`):

```css
      /* ===== Fluent borrow: Reveal highlight on tile hover ===== */
      .wp-tile {
        position: relative;
        --reveal-x: 50%;
        --reveal-y: 50%;
      }
      .wp-tile::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(
          120px circle at var(--reveal-x) var(--reveal-y),
          rgba(255, 255, 255, 0.18),
          transparent 70%
        );
        transition: opacity 200ms ease-out;
        z-index: 1;
      }
      .wp-tile.reveal-active::before { opacity: 1; }
      .wp-tile > * { position: relative; z-index: 2; }
      @media (prefers-reduced-motion: reduce) {
        .wp-tile::before { display: none; }
      }
```

- [ ] **Step 2: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Smoke**

Dev → home → move cursor across a category tile. A soft white glow should track the cursor inside the tile. Leave the tile — glow fades over 200ms.

- [ ] **Step 4: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "F1: Reveal highlight — radial glow follows cursor on .wp-tile

Pointer-driven --reveal-x/--reveal-y CSS vars (set by motion/reveal.ts)
power a radial-gradient on .wp-tile::before. 120px radius, 0.18 white,
200ms fade. Disabled for reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — C1: Toast component

**Purpose:** Reusable toast for any future "notify user" need (e.g. copy-to-clipboard, language switched). Global trigger so any inline script can call it.

**Files touched:** create `site/src/components/Toast.astro`; modify [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) to mount it once.

**Inputs:** none.

**Output:** Commit `C1: Toast component — global cantopediaToast(msg), auto-dismiss 3s`.

**Verification:** Dev console: `cantopediaToast('hi')` shows a toast that slides in, fades out 3s later.

- [ ] **Step 1: Create Toast.astro**

Create `site/src/components/Toast.astro`:

```astro
---
// Toast — fixed container; trigger via global window.cantopediaToast(msg).
// Auto-dismiss after 3s. Stacks if multiple.
// Persists across ClientRouter navigations.
---
<div class="toast-container" id="toast-container" transition:persist></div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }
  :global(.toast-item) {
    background: #1d1d1d;
    color: #fff;
    padding: 0.65rem 1.25rem;
    font-family: var(--lang-font-primary);
    font-size: 0.875rem;
    letter-spacing: 0.04em;
    border-left: 3px solid var(--m-red);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    opacity: 0;
    transform: translateY(12px);
    animation: toast-in 200ms var(--fluent-curve-decelerate-mid, ease) forwards,
               toast-out 200ms var(--fluent-curve-accelerate-mid, ease) forwards;
    animation-delay: 0s, 3s;
    pointer-events: auto;
  }
  @keyframes toast-in  { to { opacity: 1; transform: translateY(0); } }
  @keyframes toast-out { to { opacity: 0; transform: translateY(12px); } }
</style>

<script>
  (function () {
    function showToast(msg: string): void {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const item = document.createElement('div');
      item.className = 'toast-item';
      item.textContent = msg;
      container.appendChild(item);
      setTimeout(() => item.remove(), 3500);
    }
    (window as any).cantopediaToast = showToast;
  })();
</script>
```

- [ ] **Step 2: Mount in BaseLayout**

In [BaseLayout.astro](../../site/src/layouts/BaseLayout.astro), at the top of the front-matter (around line 4, after `import CategoryIcon`), add:

```typescript
import Toast from '~/components/Toast.astro';
```

In the body, just before `<main>` (around line 173), add:

```astro
    <Toast />
```

- [ ] **Step 3: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Smoke**

Dev → any page → devtools console:

```javascript
cantopediaToast('Hello from toast')
```

Toast slides in at bottom-center; 3s later, fades out.

- [ ] **Step 5: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/components/Toast.astro site/src/layouts/BaseLayout.astro
git commit -m "C1: Toast component — global cantopediaToast(msg), auto-dismiss 3s

Persistent container; per-call .toast-item with in/out animation. Font
inherits --lang-font-primary so toasts match the active locale's typography.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — C2: Tooltip component

**Purpose:** Drop-in `<Tooltip>` wrapper for inline help text. Pure CSS — no JS.

**Files touched:** create `site/src/components/Tooltip.astro`.

**Inputs:** none.

**Output:** Commit `C2: Tooltip component — pure-CSS hover tooltip with 4 positions`.

**Verification:** Component renders; build green. (No integration site-side; utility for future use.)

- [ ] **Step 1: Create Tooltip.astro**

Create `site/src/components/Tooltip.astro`:

```astro
---
interface Props {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
const { text, position = 'top' } = Astro.props;
---
<span class={`tooltip tooltip-${position}`} data-tip={text}>
  <slot />
</span>

<style>
  .tooltip {
    position: relative;
    display: inline-block;
    cursor: help;
  }
  .tooltip::after {
    content: attr(data-tip);
    position: absolute;
    background: #1d1d1d;
    color: #fff;
    padding: 0.35rem 0.625rem;
    font-family: var(--lang-font-primary);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
    border-left: 2px solid var(--m-red);
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease, transform 150ms ease;
    z-index: 50;
  }
  .tooltip:hover::after, .tooltip:focus-visible::after { opacity: 1; }
  .tooltip-top::after        { bottom: 100%; left: 50%; transform: translate(-50%, -6px); }
  .tooltip-top:hover::after  { transform: translate(-50%, -10px); }
  .tooltip-bottom::after        { top: 100%; left: 50%; transform: translate(-50%, 6px); }
  .tooltip-bottom:hover::after  { transform: translate(-50%, 10px); }
  .tooltip-left::after         { right: 100%; top: 50%; transform: translate(-6px, -50%); }
  .tooltip-left:hover::after   { transform: translate(-10px, -50%); }
  .tooltip-right::after        { left: 100%; top: 50%; transform: translate(6px, -50%); }
  .tooltip-right:hover::after  { transform: translate(10px, -50%); }
</style>
```

- [ ] **Step 2: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/components/Tooltip.astro
git commit -m "C2: Tooltip component — pure-CSS hover tooltip with 4 positions

No JS. Uses ::after content from data-tip. Font inherits --lang-font-primary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — C3: Accordion component

**Purpose:** Reusable collapsible section. Semantic `<details>` for keyboard a11y + animation enhancement.

**Files touched:** create `site/src/components/Accordion.astro`.

**Inputs:** none.

**Output:** Commit `C3: Accordion component — semantic <details> + animated chevron/body`.

**Verification:** Component renders; build green.

- [ ] **Step 1: Create Accordion.astro**

Create `site/src/components/Accordion.astro`:

```astro
---
interface Props {
  title: string;
  open?: boolean;
}
const { title, open = false } = Astro.props;
---
<details class="accordion" open={open}>
  <summary class="accordion-head">
    <span class="accordion-title">{title}</span>
    <span class="accordion-chev" aria-hidden="true">›</span>
  </summary>
  <div class="accordion-body">
    <slot />
  </div>
</details>

<style>
  .accordion {
    border-top: 1px solid var(--t-rule);
    border-bottom: 1px solid var(--t-rule);
    margin: 1rem 0;
  }
  .accordion + .accordion { margin-top: -1px; border-top: 0; }
  .accordion-head {
    list-style: none;
    cursor: pointer;
    padding: 0.875rem 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--lang-font-primary);
    font-weight: 400;
    font-size: 1rem;
    letter-spacing: 0.02em;
    user-select: none;
  }
  .accordion-head::-webkit-details-marker { display: none; }
  .accordion-chev {
    font-size: 1.25rem;
    color: var(--t-ink-dim);
    transition: transform 240ms var(--fluent-curve-easy-ease, ease);
  }
  .accordion[open] .accordion-chev { transform: rotate(90deg); }
  .accordion-body {
    padding: 0 0 1rem;
    font-family: var(--lang-font-primary);
    font-size: 0.9375rem;
    line-height: var(--lang-body-leading);
    color: var(--t-ink);
  }
  .accordion[open] .accordion-body {
    animation: accordion-in 260ms var(--fluent-curve-decelerate-mid, ease) both;
  }
  @keyframes accordion-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .accordion-chev, .accordion[open] .accordion-body { animation: none; transition: none; }
  }
</style>
```

- [ ] **Step 2: Build**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/components/Accordion.astro
git commit -m "C3: Accordion component — semantic <details> + animated chevron/body

Inherits --lang-font-primary and --lang-body-leading. Animated chevron
rotates 90deg on open; body fades+slides in. Disabled for reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — Final verification + handoff

**Purpose:** Full-site smoke across all 3 locales, light + dark + reduced-motion, plus handoff doc.

**Files touched:** create `docs/handoff/2026-05-25-wp10-refresh-done.md`.

**Inputs:** all previous tasks complete.

**Output:** Commits handoff doc, pushes to `main`, watches CI/deploy, returns deploy URL.

**Verification:** Deployed site loads cleanly; visual smoke matrix below all green.

- [ ] **Step 1: Full build with bundle inspection**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build 2>&1 | tail -15
```

Expected: 580+ pages built, no warnings or errors.

Run a bundle size check:

```bash
ls -la "d:/Cantonese Cuisine/site/dist/_astro/" 2>/dev/null | grep -E '\.js$' | sort -k5 -n -r | head -5
```

Record the top 3 JS file sizes for the handoff doc.

- [ ] **Step 2: Visual smoke matrix**

Run `pnpm dev`. Check each cell:

|  | Light | Dark | Reduced-motion |
|---|---|---|---|
| **EN home** | tiles flip, reveal glow, spring press | same + dark drawer | flip + reveal disabled, tiles still spring |
| **ZH home** | hanzi headings ~80% of EN size, tighter leading | same | same |
| **YUE home** | font is Noto Sans HK (devtools verify) | same | same |
| **Dish page (with photo)** | Ken Burns active, parallax on scroll | same + Acrylic Nav has texture | KB/parallax static |
| **Drawer** | multi-layer Acrylic visible | same | (no motion-bound state) |
| **Console** | clean across all pages | | |

If any cell fails, **stop**, note the issue in the handoff doc under "Known issues", and skip the push step.

- [ ] **Step 3: Write handoff doc**

Create `docs/handoff/2026-05-25-wp10-refresh-done.md`:

```markdown
# WP10 Metro Refresh — Completion Report

**Date:** 2026-05-25
**Spec:** docs/superpowers/specs/2026-05-25-wp10-metro-refresh-design.md
**Plan:** docs/superpowers/plans/2026-05-25-wp10-metro-refresh.md

## What shipped

| # | Feature | Status | Notes |
|---|---|---|---|
| Task 0 | MetroUI 5 spike | <PASS or FAIL> | <one-line outcome> |
| Task 1 | i18n typography framework | ✅ | html[lang] keyed; HK fonts added |
| Task 2 | M1: spring easing | ✅ | tile press has overshoot |
| Task 3 | M2: Ken Burns | ✅ | alternates A/B by menu_no parity |
| Task 4 | M3: multi-layer Acrylic | ✅ | noise + blur + saturate on drawer/nav |
| Task 5 | motion SRP modules | ✅ | parallax/reveal/liveTile + index |
| Task 6 | M4: panorama parallax | ✅ | 0.35x rate on dish hero |
| Task 7 | M5: live tile flip | ✅ | 4 home stats, 1.8s stagger, 9s cycle |
| Task 8 | F1: Reveal highlight | ✅ | radial glow on .wp-tile hover |
| Task 9 | C1: Toast | ✅ | global cantopediaToast(msg) |
| Task 10 | C2: Tooltip | ✅ | 4 positions, pure CSS |
| Task 11 | C3: Accordion | ✅ | semantic <details> |

## What was deferred

- **Pivot 1:1 finger-tracking** — architectural change requiring adjacent-page prerender + custom gesture controller + bypassing ClientRouter. Spec marked as Phase 2.
- **Multi-face live tile content** — Phase 1 just flips front/back of the same metric. Future: rotate through "今日推介 / 隨機菜 / 最近瀏覽".

## Visual smoke matrix

(Fill in from Step 2.)

## Bundle size

(Fill in from Step 1.)

## Known issues

(Fill in. If none: "All smoke checks passed.")

## Files changed

(Run `git log --oneline 659e1f2..HEAD` to list the commits — paste here.)
(Run `git diff --stat 659e1f2..HEAD | tail -20` for file-level summary.)
```

Fill in every placeholder from the actual results.

- [ ] **Step 4: Commit handoff doc**

```bash
cd "d:/Cantonese Cuisine"
git add docs/handoff/2026-05-25-wp10-refresh-done.md
git commit -m "handoff: WP10 Metro Refresh complete

See docs/handoff/2026-05-25-wp10-refresh-done.md for the matrix and bundle
report. Spec + plan in docs/superpowers/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Push to main**

```bash
git push origin main 2>&1 | tail -5
```

- [ ] **Step 6: Watch CI/deploy**

```bash
gh run list --limit 2
```

Identify both runs (CI + Deploy). Then:

```bash
gh run watch <deploy-run-id> --exit-status 2>&1 | tail -8
```

If deploy succeeds: refresh is live at https://shepherdloveyou.github.io/cantopedia.

---

## Self-review (run after writing this plan)

**Spec coverage:**

- ✅ Goal 1 (motion soul) → Tasks 2, 3, 4, 6, 7, 8 (M1–M5 + F1)
- ✅ Goal 2 (missing components) → Tasks 9, 10, 11 (C1–C3)
- ✅ Goal 3 (Fluent Reveal) → Tasks 5 (JS) + 8 (CSS)
- ✅ Goal 4 (no Vue) — explicitly excluded throughout
- ✅ Goal 5 (SOLID) → Task 5 (motion split by SRP), components have minimal props
- ✅ Goal 6 (i18n typography) → Task 1 establishes the framework; Tasks 7/9/10/11 consume the vars

**Non-goal coverage (i.e. things explicitly NOT done):**

- ✅ No Fluent migration (no Mica, no drop-shadows, no rounded corners) — never appears in any task
- ✅ No Pivot 1:1 finger-tracking — explicitly deferred in Task 12 handoff doc
- ✅ No icon/font-stack swap — keeps Open Sans / Segoe UI / Noto Sans family
- ✅ No content/schema/i18n-content changes — only typography mechanics changed

**Placeholder scan:** zero `TBD` / `TODO` / `implement later`. All code blocks complete.

**Type/name consistency:**

- `initParallax` / `initReveal` / `initLiveTile` — each module exports one of these
- `initMotion` — composition root re-exports
- `--lang-*` variables — names consistent across Task 1, 7, 9, 10, 11
- `--reveal-x` / `--reveal-y` — set in Task 5 reveal.ts; consumed in Task 8 CSS
- `--fluent-curve-tile-press` — defined in Task 2; consumed in same task's `.wp-tile.pressing`
- `.live-tile-face` / `.live-tile-face.front` / `.live-tile-face.back` — used consistently in Tasks 5 (JS module) and 7 (CSS + Astro template)

**Task ordering rationale:**

- Task 0 (spike) gates Task 9/11 component baselining (but both work either way).
- Task 1 (i18n) before motion tasks because new components (Toast, Tooltip, Accordion) consume `--lang-font-primary`.
- Task 5 (motion modules) before Tasks 6, 7, 8 (integrations that use the modules).

**Subagent dispatch readiness:**

Each task has: (a) explicit files, (b) inputs from prior tasks listed, (c) complete code blocks, (d) verification commands with expected outputs, (e) commit message. A fresh subagent with this plan + the spec + the dispatch preamble has everything it needs.
