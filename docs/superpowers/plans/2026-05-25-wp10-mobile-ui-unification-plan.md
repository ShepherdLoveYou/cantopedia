# WP10 Mobile UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 9 page types in Cantopedia conform to Windows 10 Mobile UI design language by aggressively leveraging `@olton/metroui` v5 `data-role` components and hand-rolling only what v5 lacks (Hub horizontal scroll + Pivot tab swipe).

**Architecture:** Use Metro UI v5's `data-role="tile"|"app-bar"|"listview"|"hero"` as foundational primitives. Hand-roll thin Astro components for WP10-specific Hub/Pivot patterns. Lock visual via CSS token contract enforced by vitest regex scan. Bundle 9 P1-P3 bug fixes during refactor.

**Tech Stack:** Astro 5.18, `@olton/metroui` 5.1.20, TypeScript 5.7, Playwright 1.60 (probes), Vitest 3.2, Pagefind 1.3 (build-only search).

**Spec:** `docs/superpowers/specs/2026-05-25-wp10-mobile-ui-unification-design.md`

---

## File Structure

### Create
- `src/components/HubPivot.astro` — top pivot title strip with prev/next peek (extracted from Hub.astro)
- `src/components/PivotPage.astro` — WP10 Pivot container (Dish/Ingredient/Sauce)
- `src/components/PivotTab.astro` — single tab inside PivotPage
- `src/components/MetroEmptyState.astro` — 404 / empty state
- `src/lib/pivotScripts.ts` — PivotPage tab navigation + URL sync
- `src/lib/tokens.test.ts` — vitest regression guard on design tokens
- `site/scripts/probe-pivot-tab.mjs` — Playwright probe verifying PivotPage tab swipe + click

### Modify
- `src/layouts/BaseLayout.astro` — add token vars; replace metro-nav with `data-role="app-bar"`; init Metro JS; default-render `<footer>`
- `src/components/Hub.astro` — slim down; inline all tiles using `data-role="tile"`; integrate HubPivot
- `src/components/AppListPanel.astro` — internal markup wraps `data-role="listview"`
- `src/pages/[locale]/dishes/[id].astro` — rewrite as PivotPage 4 tab
- `src/pages/[locale]/ingredients/[id].astro` — rewrite as PivotPage 2 tab
- `src/pages/[locale]/sauces/[id].astro` — rewrite as PivotPage 2 tab
- `src/pages/[locale]/search.astro` — results use `data-role="listview"`
- `src/pages/404.astro` — use MetroEmptyState
- `src/lib/hubScripts.ts` — save handler refs; delete `initCatTileCycle`/`teardownCatTileCycle`
- `site/scripts/probe-final-sweep.mjs` — port-scan 4321-4329 before sweep

### Delete
- `src/components/CatTile.astro` — replaced by inline `data-role="tile"`
- `site/scripts/probe-flip-forensic.mjs` — no longer needed
- `temp-wrap-test.mjs` — debug remnant

---

## Step 1 — Token Foundation

### Task 1.1: Add WP10 Mobile token vars to BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro` — `:root` block (around line 229-312)

- [ ] **Step 1: Locate insertion point**

Run: `grep -n "WP10 spring family" src/layouts/BaseLayout.astro`
Expected: returns one line near `--fluent-curve-decelerate-mid` comment block.

- [ ] **Step 2: Insert token block before `/* WP10 spring family */`**

Add this block immediately before the `/* WP10 spring family */` comment in `:root`:

```css
/* WP10 Mobile type ramp — 7 sizes, single source of truth */
--fs-caption: 0.7rem;
--fs-tiny: 0.8rem;
--fs-body: 0.9rem;
--fs-panel: 1rem;
--fs-title: 1.45rem;
--fs-panorama-sm: 2.4rem;
--fs-panorama: 3rem;

/* WP10 Mobile font weights — 3 weights only */
--fw-light: 200;
--fw-regular: 400;
--fw-medium: 500;

/* WP10 Mobile letter-spacing — 3 contexts */
--ls-body: 0;
--ls-meta: 0.02em;
--ls-caps: 0.22em;

/* WP10 Mobile spacing — 6 step ramp */
--sp-1: 4px;
--sp-2: 8px;
--sp-3: 12px;
--sp-4: 16px;
--sp-5: 24px;
--sp-6: 40px;

/* WP10 Mobile: flat, 0 radius everywhere except photos */
--radius: 0;
```

- [ ] **Step 3: Verify Astro dev still compiles**

Run: `cd site && npm run dev` (background); poll log for `Local`.
Expected: server prints `Local http://localhost:43xx/cantopedia` with no error.

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat(tokens): add WP10 Mobile design tokens to BaseLayout :root"
```

---

## Step 2 — Spike: metro-nav → `data-role="app-bar"` (validates Metro v5 integration)

### Task 2.1: Add Metro UI v5 JS bundle to BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro` — `<head>` section (around line 80)

- [ ] **Step 1: Add JS import after `<ClientRouter />`**

In `src/layouts/BaseLayout.astro`, find `<ClientRouter />` (line ~80) and add immediately after it:

```astro
<script>
  import '@olton/metroui/lib/metro.js';
</script>
```

- [ ] **Step 2: Move existing metro.css/icons.css imports from Hub.astro to BaseLayout**

In `src/layouts/BaseLayout.astro` `<head>`, add (before `<ClientRouter />`):

```astro
<link rel="stylesheet" href={`${base}/_astro/metro.css`} />
```

No — Metro CSS should import via JS module. Replace the line above with this in the existing `<script>` block:

```astro
<script>
  import '@olton/metroui/lib/metro.css';
  import '@olton/metroui/lib/icons.css';
  import '@olton/metroui/lib/metro.js';
</script>
```

In `src/components/Hub.astro`, delete lines 18-19:

```typescript
import '@olton/metroui/lib/metro.css';
import '@olton/metroui/lib/icons.css';
```

- [ ] **Step 3: Restart dev server and verify no console errors**

Kill background dev server, restart: `cd site && npm run dev`.
Open `http://localhost:43xx/cantopedia/zh` in browser; DevTools console should be empty (no Metro JS errors).

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro site/src/components/Hub.astro
git commit -m "refactor: move @olton/metroui imports to BaseLayout for global init"
```

### Task 2.2: Replace metro-nav with data-role="app-bar"

**Files:**
- Modify: `src/layouts/BaseLayout.astro` — `<nav class="metro-nav">` (around lines 84-95)

- [ ] **Step 1: Replace nav markup**

In `src/layouts/BaseLayout.astro`, replace the existing `<nav class="metro-nav">` block (lines 84-95) with:

```astro
{showNav && (
  <div class="metro-nav app-bar" data-role="app-bar" data-expand="true" data-expand-point="0" transition:persist>
    <a class="brand app-bar-brand" href={`${base}/${locale}`}>
      <span class="brand-name">CANTOPEDIA</span>
    </a>
    <ul class="app-bar-menu locale-switcher">
      {(['zh', 'yue', 'en'] as const).map((loc) => (
        <li>
          <a class={`pivot-tab ${loc === locale ? 'active' : ''}`} data-loc={loc} href={localeHref(loc)}>
            {loc === 'zh' ? '中' : loc === 'yue' ? '粵' : 'EN'}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

Note: `data-expand="true"` + `data-expand-point="0"` forces Metro's app-bar to stay expanded at all viewports (we don't want the auto hamburger collapse — WP10 status bar is always visible).

- [ ] **Step 2: Take before/after screenshot to verify**

Run: `cd site && node scripts/probe-home-full.mjs`
Expected: 3 screenshots written to `site/probe-out/home-desktop-centered.png` etc.
Open the desktop screenshot — verify nav still appears as black bar with brand center + locale tabs right.

- [ ] **Step 3: If visual breaks, evaluate fallback**

If app-bar renders differently from old metro-nav (height changed / hamburger appeared / brand shifted):
1. Inspect computed styles: `console.log(getComputedStyle(document.querySelector('.metro-nav')))`.
2. Add override CSS in BaseLayout `<style is:global>` to restore: `height: 40px`, `padding: 0 0.75rem`, `background: #000 var(--acrylic-noise)`.
3. If still broken: revert this task and append to spec `Open Question 2` outcome — fallback path is "use Metro CSS classes without `data-role` JS init".

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "refactor(nav): replace metro-nav with Metro v5 data-role=app-bar (spike pass)"
```

---

## Step 3 — Replace CatTile flip with `data-role="tile"`

### Task 3.1: Add data-role="tile" markup to one category tile to validate switch effect

**Files:**
- Modify: `src/components/Hub.astro` — first `<CatTile>` in `allCats.map` (around lines 188-202)

- [ ] **Step 1: Pick the appetizer (first) tile and replace its `<CatTile>` with inline Metro tile**

In `src/components/Hub.astro`, find `allCats.map((cat) => {` and replace the `<CatTile ... />` for the first category with this conditional block (keep `<CatTile>` for the other 7 categories during this spike):

```astro
{cat.id === 'appetizer' ? (
  <div
    class="tile-medium wp-tile cat-tile-v5"
    data-role="tile"
    data-size="medium"
    data-effect="switch"
    style={`background: ${tileColorFor(cat.id)}; view-transition-name: tile-${cat.id};`}
    aria-label={`${catName} (${inCat.length} ${dict.pieces})`}
  >
    <div class="tile-slide">
      <span class="tile-icon"><CategoryIcon cat={cat.id as CatId} size={48} /></span>
      <span class="tile-name">{catName}</span>
      <span class="tile-badge">{inCat.length}</span>
    </div>
    {categoryPhoto(cat.id) && (
      <div class="tile-slide" style={`background-image: url('${categoryPhoto(cat.id)}'); background-size: cover; background-position: center;`}>
        <span class="tile-name">{catName}</span>
      </div>
    )}
  </div>
) : (
  <CatTile
    size="m"
    href={`${base}/${locale}/browse/${cat.id}`}
    color={tileColorFor(cat.id)}
    label={catName}
    count={inCat.length}
    countLabel={dict.pieces}
    photo={categoryPhoto(cat.id)}
    viewTransitionName={`tile-${cat.id}`}
    ariaLabel={`${catName} (${inCat.length} ${dict.pieces})`}
  >
    <CategoryIcon cat={cat.id as CatId} size={48} />
  </CatTile>
)}
```

- [ ] **Step 2: Take screenshot to verify Metro switch effect runs**

Run: `cd site && node scripts/probe-cat-tile-video.mjs`
Expected: produces a video / frame sequence in `site/probe-out/` showing the appetizer tile transitioning between solid-icon face and photo face every ~3s (Metro default).

- [ ] **Step 3: Compare appetizer tile flip vs old CatTile flip side-by-side**

Run: `node scripts/probe-final-sweep.mjs` to get 90-route screenshots.
Open `desktop-zh-home.png` — appetizer tile should be transitioning (catch it mid-animation). Other tiles should still flip via old CatTile.

- [ ] **Step 4: If switch effect is wrong (e.g. fade instead of rotate), try alternative effects**

If `data-effect="switch"` doesn't produce a flip animation (just hard cut), try `data-effect="slide-up"` or `data-effect="zoom"` in the same markup. If none satisfy, fallback: keep `<CatTile>` and just delete the spike block — revert task 3.1 commit.

- [ ] **Step 5: Commit the validated effect**

```bash
git add site/src/components/Hub.astro
git commit -m "spike: validate Metro v5 tile data-effect on appetizer tile"
```

### Task 3.2: Roll out data-role tile to all 8 category tiles

**Files:**
- Modify: `src/components/Hub.astro` — `allCats.map` block (around lines 180-203)

- [ ] **Step 1: Remove the spike conditional, apply Metro tile to all 8 categories**

In `src/components/Hub.astro`, replace the entire `allCats.map((cat) => {...return ( <CatTile>...</CatTile> );})` block with:

```astro
{allCats.map((cat) => {
  const inCat = dishesByCat.get(cat.id) ?? [];
  if (inCat.length === 0) return null;
  const catName = nameOf(cat);
  const photo = categoryPhoto(cat.id);
  const color = tileColorFor(cat.id);
  return (
    <a
      class="tile-medium wp-tile"
      data-role="tile"
      data-size="medium"
      data-effect={photo ? 'switch' : 'none'}
      href={`${base}/${locale}/browse/${cat.id}`}
      style={`background: ${color}; view-transition-name: tile-${cat.id};`}
      aria-label={`${catName} (${inCat.length} ${dict.pieces})`}
    >
      <div class="tile-slide tile-slide--front">
        <span class="tile-icon"><CategoryIcon cat={cat.id as CatId} size={48} /></span>
        <span class="tile-name">{catName}</span>
        <span class="tile-badge">{inCat.length}</span>
      </div>
      {photo && (
        <div class="tile-slide tile-slide--back" style={`background-image: url('${photo}'); background-size: cover; background-position: center;`}>
          <span class="dish-scrim"></span>
          <span class="tile-name tile-name--back">{catName}</span>
        </div>
      )}
    </a>
  );
})}
```

- [ ] **Step 2: Remove now-unused `<CatTile>` import**

In `src/components/Hub.astro` line 20, delete:

```typescript
import CatTile from '~/components/CatTile.astro';
```

- [ ] **Step 3: Verify build still passes**

Run: `cd site && npm run build`
Expected: build completes; no "module not found" errors for CatTile.

- [ ] **Step 4: Run full sweep, verify no console errors and no missing tiles**

Run: `node scripts/probe-final-sweep.mjs`
Expected: `Total error events: 0` (or only websocket noise). Open `desktop-zh-home.png` — all 8 cat tiles render with icons + badges + names.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "refactor(hub): replace CatTile component with inline data-role=tile for 8 category tiles"
```

### Task 3.3: Delete CatTile flip logic from hubScripts.ts

**Files:**
- Modify: `src/lib/hubScripts.ts` — lines 212-265 (`_catTileTimers`, `initCatTileCycle`, `teardownCatTileCycle`)
- Modify: `src/components/Hub.astro` — script block (around lines 295-316)

- [ ] **Step 1: Delete the cat-tile cycle section from hubScripts.ts**

In `src/lib/hubScripts.ts`, delete lines from `const _catTileTimers = new WeakMap...` through end of `teardownCatTileCycle()` function (all of lines 212-265).

- [ ] **Step 2: Remove imports of deleted functions from Hub.astro script**

In `src/components/Hub.astro` around line 297, change:

```typescript
import { initFeaturedTile, teardownFeaturedTile, initHubNav, teardownHubNav,
         initCatTileCycle, teardownCatTileCycle } from '~/lib/hubScripts';
```

to:

```typescript
import { initFeaturedTile, teardownFeaturedTile, initHubNav, teardownHubNav } from '~/lib/hubScripts';
```

And remove `initCatTileCycle();` from `boot()` and `teardownCatTileCycle();` from `teardown()`.

- [ ] **Step 3: Verify dev server compiles and no console errors**

Reload `http://localhost:43xx/cantopedia/zh` — DevTools console should have no `initCatTileCycle is not defined` errors.

- [ ] **Step 4: Commit**

```bash
git add site/src/lib/hubScripts.ts site/src/components/Hub.astro
git commit -m "refactor(hub): delete CatTile cycle JS (Metro v5 data-effect now drives flip)"
```

### Task 3.4: Delete obsolete files

**Files:**
- Delete: `src/components/CatTile.astro`
- Delete: `site/scripts/probe-flip-forensic.mjs`
- Delete: `temp-wrap-test.mjs`

- [ ] **Step 1: Verify nothing references CatTile**

Run: `grep -rn "CatTile" site/src/`
Expected: 0 matches.

- [ ] **Step 2: Delete files**

```bash
rm site/src/components/CatTile.astro
rm site/scripts/probe-flip-forensic.mjs
rm temp-wrap-test.mjs
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete CatTile.astro and obsolete probe scripts"
```

---

## Step 4 — New components (HubPivot, PivotPage, PivotTab, MetroEmptyState)

### Task 4.1: Create HubPivot.astro

**Files:**
- Create: `src/components/HubPivot.astro`

- [ ] **Step 1: Write the component**

Create `src/components/HubPivot.astro` with this content:

```astro
---
/**
 * Hub-style top pivot title strip — title centered, prev/next peek labels
 * on the sides. Used by Hub (panels) and PivotPage (tabs). Renders SSR
 * title from initialTitle; JS updates as user scrolls/clicks.
 *
 * Props:
 *   initialTitle: string  — SSR-rendered title
 *   prevId?: string       — DOM id of prev link (default 'hub-pivot-prev')
 *   nextId?: string       — DOM id of next link (default 'hub-pivot-next')
 */
interface Props {
  initialTitle: string;
  prevId?: string;
  nextId?: string;
  titleId?: string;
}
const { initialTitle, prevId = 'hub-pivot-prev', nextId = 'hub-pivot-next', titleId = 'hub-pivot-title' } = Astro.props;
---
<nav class="hub-pivot" aria-label="Pivot">
  <button type="button" class="hub-pivot-link hub-pivot-link--prev" id={prevId} data-dir="prev" aria-label="Previous">
    <span class="hub-pivot-peek hub-pivot-peek--prev" id={`${prevId}-peek`} aria-hidden="true"></span>
    <span class="hub-pivot-arrow">‹</span>
  </button>
  <h1 class="hub-pivot-title" id={titleId}>{initialTitle}</h1>
  <button type="button" class="hub-pivot-link hub-pivot-link--next" id={nextId} data-dir="next" aria-label="Next">
    <span class="hub-pivot-arrow">›</span>
    <span class="hub-pivot-peek hub-pivot-peek--next" id={`${nextId}-peek`} aria-hidden="true"></span>
  </button>
</nav>

<style>
  .hub-pivot {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5) var(--sp-2);
    font-family: var(--lang-font-primary);
    min-height: 4.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  .hub-pivot-title {
    font-size: clamp(var(--fs-title), 7vw, var(--fs-panorama));
    font-weight: var(--fw-light);
    letter-spacing: var(--ls-meta);
    line-height: 1;
    margin: 0;
    text-align: center;
    color: var(--t-ink);
    overflow-wrap: break-word;
  }
  .hub-pivot-link {
    display: inline-flex;
    align-items: baseline;
    gap: var(--sp-1);
    color: var(--ink);
    text-decoration: none;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
  }
  .hub-pivot-arrow {
    font-size: var(--fs-title);
    font-weight: var(--fw-light);
    line-height: 1;
  }
  .hub-pivot-peek {
    font-family: var(--sans), var(--sans-zh);
    font-weight: var(--fw-light);
    font-size: var(--fs-body);
    color: var(--ink-dim);
    opacity: 0.55;
    max-width: 8ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: var(--ls-meta);
  }
  @media (max-width: 540px) {
    .hub-pivot { min-height: 3.5rem; padding: var(--sp-3) var(--sp-4) var(--sp-1); }
    .hub-pivot-peek { display: none; }
  }
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd site && npx astro check 2>&1 | grep -i hubpivot`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/HubPivot.astro
git commit -m "feat(components): add HubPivot — extracted pivot title strip"
```

### Task 4.2: Create PivotPage.astro

**Files:**
- Create: `src/components/PivotPage.astro`

- [ ] **Step 1: Write the component**

Create `src/components/PivotPage.astro`:

```astro
---
/**
 * WP10 Pivot container — horizontal scroll-snap of N tabs.
 * Mimics WP10 Mobile Pivot pattern (Mail/Calendar): tabs swipe sideways.
 *
 * Children: <PivotTab id name> ... </PivotTab>
 *
 * Props:
 *   initialTab?: string  — id of the tab to show first (default: first child)
 *   pivotTitle?: string  — top strip title (if absent, no HubPivot rendered)
 *   prevHref?: string    — URL for prev (e.g. prev dish)
 *   nextHref?: string    — URL for next
 */
import HubPivot from '~/components/HubPivot.astro';

interface Props {
  initialTab?: string;
  pivotTitle?: string;
  prevHref?: string;
  nextHref?: string;
  prevLabel?: string;
  nextLabel?: string;
}
const { initialTab, pivotTitle, prevHref, nextHref, prevLabel, nextLabel } = Astro.props;
---
{pivotTitle && <HubPivot initialTitle={pivotTitle} />}

<div class="pivot-page" data-initial-tab={initialTab ?? ''}>
  <nav class="pivot-tabs" id="pivot-tabs" aria-label="Tabs">
    {/* Tab labels are JS-rendered from children on mount */}
  </nav>
  <div class="pivot-panels" id="pivot-panels">
    <slot />
  </div>
</div>

{(prevHref || nextHref) && (
  <nav class="pivot-page-nav" aria-label="Previous/Next">
    {prevHref && <a class="pivot-page-prev" href={prevHref} rel="prev">‹ {prevLabel ?? 'Prev'}</a>}
    {nextHref && <a class="pivot-page-next" href={nextHref} rel="next">{nextLabel ?? 'Next'} ›</a>}
  </nav>
)}

<script>
  import { initPivotPage, teardownPivotPage } from '~/lib/pivotScripts';
  function boot() { initPivotPage(); }
  function teardown() { teardownPivotPage(); }
  boot();
  document.addEventListener('astro:after-swap', boot);
  document.addEventListener('astro:page-load', boot);
  document.addEventListener('astro:before-preparation', teardown);
</script>

<style>
  .pivot-page {
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
  }
  .pivot-tabs {
    display: flex;
    gap: var(--sp-5);
    padding: var(--sp-3) var(--sp-5) 0;
    border-bottom: 1px solid var(--t-rule);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .pivot-tabs::-webkit-scrollbar { display: none; }
  .pivot-tabs .pivot-tab-label {
    font-family: var(--sans), var(--sans-zh);
    font-size: var(--fs-title);
    font-weight: var(--fw-light);
    color: var(--t-ink-dim);
    letter-spacing: var(--ls-body);
    padding: var(--sp-2) 0 var(--sp-3);
    white-space: nowrap;
    cursor: pointer;
    transition: color 200ms ease;
    background: none;
    border: 0;
  }
  .pivot-tabs .pivot-tab-label[aria-selected="true"] {
    color: var(--t-ink);
    border-bottom: 3px solid var(--m-red);
  }
  .pivot-panels {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .pivot-panels::-webkit-scrollbar { display: none; }
  .pivot-page-nav {
    display: flex;
    justify-content: space-between;
    padding: var(--sp-5);
    border-top: 1px solid var(--t-rule);
    margin-top: var(--sp-5);
  }
  .pivot-page-nav a {
    font-family: var(--sans);
    font-size: var(--fs-body);
    letter-spacing: var(--ls-caps);
    text-transform: uppercase;
    color: var(--ink-dim);
    text-decoration: none;
  }
  .pivot-page-nav a:hover { color: var(--m-red); }
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd site && npx astro check 2>&1 | grep -i pivotpage`
Expected: no errors (lib/pivotScripts.ts will be added in Task 4.5; for now expect a "module not found" until 4.5 — defer commit until then).

- [ ] **Step 3: Defer commit until pivotScripts.ts exists (Task 4.5)**

### Task 4.3: Create PivotTab.astro

**Files:**
- Create: `src/components/PivotTab.astro`

- [ ] **Step 1: Write the component**

Create `src/components/PivotTab.astro`:

```astro
---
/**
 * Single PivotPage tab. Wraps slot content in a scroll-snap panel.
 *
 * Props:
 *   id: string         — unique tab identifier (used in URL hash)
 *   name: string       — tab label rendered in PivotPage's <nav>
 *   selected?: boolean — initial selected state
 */
interface Props {
  id: string;
  name: string;
  selected?: boolean;
}
const { id, name, selected } = Astro.props;
---
<section
  class="pivot-tab-panel"
  data-pivot-tab
  data-tab-id={id}
  data-tab-name={name}
  data-selected={selected ? 'true' : 'false'}
  role="tabpanel"
  aria-labelledby={`pivot-tab-label-${id}`}
>
  <slot />
</section>

<style>
  .pivot-tab-panel {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--sp-4) var(--sp-5) var(--sp-6);
    min-height: 50vh;
  }
</style>
```

- [ ] **Step 2: Defer commit until Task 4.5**

### Task 4.4: Create MetroEmptyState.astro

**Files:**
- Create: `src/components/MetroEmptyState.astro`

- [ ] **Step 1: Write the component**

Create `src/components/MetroEmptyState.astro`:

```astro
---
/**
 * WP10 Metro-style empty state. Used by 404 and "no search results".
 *
 * Props:
 *   bigText: string    — large display text (e.g. "404")
 *   subtitle: string   — explanation under the big text
 *   actionHref: string — URL for the action tile
 *   actionLabel: string — label inside the tile
 */
interface Props {
  bigText: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
}
const { bigText, subtitle, actionHref, actionLabel } = Astro.props;
---
<section class="metro-empty">
  <div class="metro-empty-big">{bigText}</div>
  <p class="metro-empty-sub">{subtitle}</p>
  <a
    class="tile-medium wp-tile metro-empty-action"
    data-role="tile"
    data-size="medium"
    href={actionHref}
    style="background: var(--m-red);"
  >
    <span class="metro-empty-action-label">{actionLabel}</span>
  </a>
</section>

<style>
  .metro-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--sp-6) var(--sp-5);
    text-align: center;
    min-height: 60vh;
  }
  .metro-empty-big {
    font-family: var(--sans);
    font-size: 8rem;
    font-weight: var(--fw-light);
    line-height: 1;
    color: var(--t-ink);
    margin: 0 0 var(--sp-5);
    letter-spacing: -0.02em;
  }
  .metro-empty-sub {
    font-family: var(--lang-font-primary);
    font-size: var(--fs-panel);
    color: var(--t-ink-dim);
    margin: 0 0 var(--sp-6);
    max-width: 30ch;
  }
  .metro-empty-action {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    text-decoration: none;
  }
  .metro-empty-action-label {
    font-family: var(--sans);
    font-size: var(--fs-body);
    font-weight: var(--fw-medium);
    letter-spacing: var(--ls-caps);
    text-transform: uppercase;
  }
</style>
```

- [ ] **Step 2: Defer commit until Task 4.5**

### Task 4.5: Create pivotScripts.ts and commit all new components

**Files:**
- Create: `src/lib/pivotScripts.ts`

- [ ] **Step 1: Write the module**

Create `src/lib/pivotScripts.ts`:

```typescript
/**
 * PivotPage tab navigation: builds the tab strip from <PivotTab data-pivot-tab>
 * children, syncs URL hash on scroll, handles click + ArrowLeft/Right.
 * Idempotent — dataset.wired guard short-circuits repeat init.
 */

const handlerRefs = new WeakMap<HTMLElement, {
  click: (e: Event) => void;
  scroll: () => void;
  keydown: (e: KeyboardEvent) => void;
}>();

export function initPivotPage() {
  const root = document.querySelector<HTMLElement>('.pivot-page');
  if (!root || root.dataset.wired === '1') return;
  root.dataset.wired = '1';

  const panelsEl = root.querySelector<HTMLElement>('#pivot-panels');
  const tabsEl = root.querySelector<HTMLElement>('#pivot-tabs');
  if (!panelsEl || !tabsEl) return;

  const tabs = Array.from(panelsEl.querySelectorAll<HTMLElement>('[data-pivot-tab]'));
  if (tabs.length === 0) return;

  // Build tab labels in the strip
  tabsEl.innerHTML = '';
  tabs.forEach((tab, idx) => {
    const id = tab.dataset.tabId ?? `tab-${idx}`;
    const name = tab.dataset.tabName ?? `Tab ${idx + 1}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pivot-tab-label';
    btn.id = `pivot-tab-label-${id}`;
    btn.textContent = name;
    btn.dataset.tabTarget = id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.dataset.selected === 'true' ? 'true' : 'false');
    tabsEl.appendChild(btn);
  });

  // Find initial tab — URL hash > data-selected > first
  const hash = location.hash.replace(/^#/, '');
  const initialId = tabs.find((t) => t.dataset.tabId === hash)?.dataset.tabId
    ?? tabs.find((t) => t.dataset.selected === 'true')?.dataset.tabId
    ?? tabs[0].dataset.tabId;
  const initialIdx = tabs.findIndex((t) => t.dataset.tabId === initialId);

  function scrollToTab(i: number) {
    const target = tabs[i];
    if (!target) return;
    const offset = target.offsetLeft;
    panelsEl!.scrollTo({ left: offset, behavior: 'smooth' });
  }

  function activeTabIdx(): number {
    const sl = panelsEl!.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    tabs.forEach((t, i) => {
      const d = Math.abs(t.offsetLeft - sl);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function syncTabStrip(activeIdx: number) {
    const id = tabs[activeIdx]?.dataset.tabId;
    if (!id) return;
    tabsEl!.querySelectorAll<HTMLElement>('.pivot-tab-label').forEach((b) => {
      b.setAttribute('aria-selected', b.dataset.tabTarget === id ? 'true' : 'false');
    });
    if (location.hash.replace(/^#/, '') !== id) {
      history.replaceState(null, '', `#${id}`);
    }
  }

  // Initial scroll
  if (initialIdx > 0) {
    panelsEl.style.scrollBehavior = 'auto';
    panelsEl.scrollLeft = tabs[initialIdx].offsetLeft;
    requestAnimationFrame(() => { panelsEl.style.scrollBehavior = 'smooth'; });
  }
  syncTabStrip(initialIdx >= 0 ? initialIdx : 0);

  // Wire click
  const clickHandler = (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('.pivot-tab-label');
    if (!btn) return;
    const id = btn.dataset.tabTarget;
    const idx = tabs.findIndex((t) => t.dataset.tabId === id);
    if (idx >= 0) scrollToTab(idx);
  };
  tabsEl.addEventListener('click', clickHandler);

  // Wire scroll → sync tab strip
  let scrollT: number | undefined;
  const scrollHandler = () => {
    window.clearTimeout(scrollT);
    scrollT = window.setTimeout(() => syncTabStrip(activeTabIdx()), 80);
  };
  panelsEl.addEventListener('scroll', scrollHandler, { passive: true });

  // Wire keydown
  const keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToTab(Math.max(0, activeTabIdx() - 1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToTab(Math.min(tabs.length - 1, activeTabIdx() + 1)); }
  };
  root.addEventListener('keydown', keydownHandler);

  handlerRefs.set(root, { click: clickHandler, scroll: scrollHandler, keydown: keydownHandler });
}

export function teardownPivotPage() {
  const root = document.querySelector<HTMLElement>('.pivot-page');
  if (!root) return;
  const refs = handlerRefs.get(root);
  if (refs) {
    const tabsEl = root.querySelector<HTMLElement>('#pivot-tabs');
    const panelsEl = root.querySelector<HTMLElement>('#pivot-panels');
    tabsEl?.removeEventListener('click', refs.click);
    panelsEl?.removeEventListener('scroll', refs.scroll);
    root.removeEventListener('keydown', refs.keydown);
    handlerRefs.delete(root);
  }
  delete root.dataset.wired;
}
```

- [ ] **Step 2: Verify all 4 new files compile together**

Run: `cd site && npx astro check 2>&1 | grep -i error`
Expected: 0 errors.

- [ ] **Step 3: Commit all 4 new files**

```bash
git add site/src/components/HubPivot.astro site/src/components/PivotPage.astro site/src/components/PivotTab.astro site/src/components/MetroEmptyState.astro site/src/lib/pivotScripts.ts
git commit -m "feat(components): add HubPivot, PivotPage, PivotTab, MetroEmptyState + pivotScripts"
```

### Task 4.6: Create probe-pivot-tab.mjs

**Files:**
- Create: `site/scripts/probe-pivot-tab.mjs`

- [ ] **Step 1: Write the probe**

Create `site/scripts/probe-pivot-tab.mjs`:

```javascript
/**
 * Playwright probe: verify PivotPage tab navigation works.
 * Used after Step 6 (Dish detail rewrite). Should be invoked once
 * Dish detail page uses PivotPage.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out', 'pivot-tab');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push({ kind: 'pageerror', msg: e.message }));
p.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', msg: m.text() }); });

// Navigate to a dish detail page
await p.goto(`http://localhost:${PORT}/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

// Verify pivot tabs exist
const tabCount = await p.locator('.pivot-tab-label').count();
if (tabCount !== 4) {
  console.error(`FAIL: expected 4 pivot tabs, got ${tabCount}`);
  await browser.close(); process.exit(1);
}

// Take screenshot of initial state
await p.screenshot({ path: resolve(OUT, '01-initial.png') });

// Click second tab
await p.locator('.pivot-tab-label').nth(1).click();
await p.waitForTimeout(600);
await p.screenshot({ path: resolve(OUT, '02-after-tab2.png') });

// ArrowRight to third tab
await p.keyboard.press('ArrowRight');
await p.waitForTimeout(600);
await p.screenshot({ path: resolve(OUT, '03-after-arrow-right.png') });

// Verify URL hash updated
const hash = await p.evaluate(() => location.hash);
if (!hash) {
  console.error(`FAIL: URL hash not updated after tab nav`);
  await browser.close(); process.exit(1);
}

console.log(`PASS — tabs: ${tabCount}, final hash: ${hash}, errors: ${errors.length}`);
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
```

- [ ] **Step 2: Don't run yet (Dish detail not rewritten yet) — just commit**

```bash
git add site/scripts/probe-pivot-tab.mjs
git commit -m "test: add probe-pivot-tab for PivotPage verification (runs after step 6)"
```

---

## Step 5 — Hub.astro panel rewrite (inline data-role tiles)

### Task 5.1: Replace stat-tile-mt with data-role="tile"

**Files:**
- Modify: `src/components/Hub.astro` — lines 206-221 (4 stat tiles)

- [ ] **Step 1: Replace the 4 stat-tile-mt anchors**

In `src/components/Hub.astro`, find the 4 `<a class="tile-medium wp-tile stat-tile-mt">` tiles. Replace each with this template (varying `--bg-color`, `--num`, `--label`):

```astro
<a
  class="tile-medium wp-tile stat-tile-mt"
  data-role="tile"
  data-size="medium"
  href={`${base}/${locale}/all`}
  style="background: var(--m-green); view-transition-name: stat-complete;"
>
  <div class="tile-slide">
    <span class="stat-num">{complete}</span>
    <span class="stat-label">{dict.complete}</span>
  </div>
</a>
```

Repeat for the other 3 (draft / stub / total), changing `background`, `--stat-num` content, `--label` content.

- [ ] **Step 2: Replace the 5 util-tile (search + 3 themes + github)**

Same pattern — each becomes:

```astro
<button
  type="button"
  class="tile-small wp-tile util-tile"
  data-role="tile"
  data-size="small"
  data-theme-choice="light"
  style="background: var(--m-yellow);"
  aria-label={dict.light ?? 'Light'}
>
  <div class="tile-slide">
    <span class="mif-sunny util-icon"></span>
  </div>
</button>
```

- [ ] **Step 3: Verify screenshot**

Run: `node scripts/probe-home-full.mjs`
Open `probe-out/home-desktop-centered.png` — verify all stat + util tiles still render correctly.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "refactor(hub): inline data-role=tile for stat and utility tiles"
```

### Task 5.2: Replace dish-tile in browse panels with data-role="tile"

**Files:**
- Modify: `src/components/Hub.astro` — lines 252-286 (`allCats.map` for browse panels)

- [ ] **Step 1: Replace the inner `dishes.map((dish) => {...})` block**

Find the section starting `{allCats.map((cat) => {` for browse panels (after the home panel `</section>` close). Inside the inner `dishes.map`, replace each `<a class="tile-medium wp-tile dish-tile">` with:

```astro
<a
  class="tile-medium wp-tile dish-tile"
  data-role="tile"
  data-size="medium"
  href={`${base}/${locale}/dishes/${dish.id}`}
  style={`background: ${tileColor}; ${thumb ? `background-image: url('${thumb}'); background-size: cover; background-position: center;` : ''} view-transition-name: dish-${dish.id};`}
  aria-label={dishName}
>
  <div class="tile-slide dish-tile-slide">
    <span class="dish-scrim" aria-hidden="true"></span>
    <span class="dish-no">#{String(dish.data.menu_no).padStart(2, '0')}</span>
    <span class="dish-name">{dishName}</span>
  </div>
</a>
```

- [ ] **Step 2: Verify all 8 browse panels render dish tiles**

Run: `node scripts/probe-final-sweep.mjs`
Open several screenshots (`desktop-zh-browse-noodle.png`, `desktop-en-browse-rice.png`) — verify dish tiles still render with photo + number + name.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "refactor(hub): inline data-role=tile for dish tiles in browse panels"
```

### Task 5.3: Replace featured-tile with data-role="tile" data-effect="slide-left"

**Files:**
- Modify: `src/components/Hub.astro` — lines 158-177 (featured-tile)
- Modify: `src/lib/hubScripts.ts` — `initFeaturedTile` function (lines 11-71)

- [ ] **Step 1: Replace featured-tile markup with data-role=tile**

In `src/components/Hub.astro`, replace the `<a id="featured-tile" class="tile-wide featured-tile wp-tile" ...>` block with:

```astro
<a
  id="featured-tile"
  class="tile-wide featured-tile wp-tile"
  data-role="tile"
  data-size="wide"
  data-effect="slide-up"
  href={`${base}/${locale}/dishes/${firstDishId}`}
>
  <div class="tile-slide featured-slide" data-face="today">
    <div class="featured-img"></div>
    <div class="featured-overlay"></div>
    <span class="branding-bar featured-label">{dict.featured_today}</span>
    <span class="featured-name"></span>
  </div>
  <div class="tile-slide featured-slide" data-face="random">
    <div class="featured-img"></div>
    <div class="featured-overlay"></div>
    <span class="branding-bar featured-label">{dict.featured_random}</span>
    <span class="featured-name"></span>
  </div>
  <div class="tile-slide featured-slide" data-face="recent">
    <div class="featured-img"></div>
    <div class="featured-overlay"></div>
    <span class="branding-bar featured-label">{dict.featured_recent}</span>
    <span class="featured-name"></span>
  </div>
</a>
```

- [ ] **Step 2: Update initFeaturedTile to populate by data-face, not class**

In `src/lib/hubScripts.ts`, change the cycle interval section (around line 62-70):

```typescript
// OLD:
const intervalId = window.setInterval(() => {
  faces[i].classList.remove('featured-face--active');
  i = (i + 1) % faces.length;
  faces[i].classList.add('featured-face--active');
  ...
});
```

Replace with:

```typescript
// NEW: Metro v5 data-effect drives slide animation. We only need to keep tile.href in sync.
const slides = tile.querySelectorAll<HTMLElement>('.tile-slide.featured-slide');
const intervalId = window.setInterval(() => {
  i = (i + 1) % slides.length;
  const f = slides[i].dataset.face;
  if (f && picks[f]) tile.href = `${base}/${locale}/dishes/${picks[f].id}`;
}, 6000);
```

Also update the `clickHandler` (line 47-56) to use slides instead of faces:

```typescript
const clickHandler = () => {
  const slides = tile.querySelectorAll<HTMLElement>('.tile-slide.featured-slide');
  // Metro keeps the "current" slide as the first visible one; query DOM order
  const f = slides[0]?.dataset.face ?? 'today';
  const pick = picks[f];
  if (pick) {
    try { localStorage.setItem('cantopedia-last-dish', pick.id); } catch {}
    tile.href = `${base}/${locale}/dishes/${pick.id}`;
  }
};
```

- [ ] **Step 3: Verify featured tile cycles every 6s**

Open `http://localhost:43xx/cantopedia/zh` in browser. Wait 7s. Verify the featured tile's image + name + label changes (e.g. today → random → recent).

- [ ] **Step 4: Commit**

```bash
git add site/src/components/Hub.astro site/src/lib/hubScripts.ts
git commit -m "refactor(hub): featured tile uses Metro v5 data-effect=slide-up + 3 slides"
```

---

## Step 6 — Dish detail rewrite as PivotPage 4 tab

### Task 6.1: Sketch new dish detail markup

**Files:**
- Modify: `src/pages/[locale]/dishes/[id].astro` (full rewrite of `<BaseLayout>...</BaseLayout>` content)

- [ ] **Step 1: Read existing dish page content area to inventory what goes into each tab**

Run: `grep -n "ingredients\|method\|tips\|history\|sources\|sauce_link" site/src/pages/[locale]/dishes/[id].astro`
Expected: line numbers for each content section.

- [ ] **Step 2: Compute prev/next dish for navigation**

In `src/pages/[locale]/dishes/[id].astro` frontmatter, add after the `sources` collection block:

```typescript
// Compute prev/next dish in menu_no order within same category
const sameCat = (await getCollection('dish'))
  .filter((d) => d.data.category.id === dish.data.category.id)
  .sort((a, b) => a.data.menu_no - b.data.menu_no);
const myIdx = sameCat.findIndex((d) => d.id === dish.id);
const prevDish = myIdx > 0 ? sameCat[myIdx - 1] : null;
const nextDish = myIdx >= 0 && myIdx < sameCat.length - 1 ? sameCat[myIdx + 1] : null;

const prevName = prevDish ? (locale === 'en' ? prevDish.data.names.en : prevDish.data.names.yue_hant) : '';
const nextName = nextDish ? (locale === 'en' ? nextDish.data.names.en : nextDish.data.names.yue_hant) : '';
```

- [ ] **Step 3: Replace the full `<BaseLayout>...</BaseLayout>` content with PivotPage structure**

Replace everything between `<BaseLayout title={title} locale={locale}>` and `</BaseLayout>` with:

```astro
<BaseLayout title={title} locale={locale}>
  <PivotPage
    pivotTitle={dish.data.names.yue_hant}
    prevHref={prevDish ? `${base}/${locale}/dishes/${prevDish.id}` : undefined}
    nextHref={nextDish ? `${base}/${locale}/dishes/${nextDish.id}` : undefined}
    prevLabel={prevName}
    nextLabel={nextName}
    initialTab="ingredients"
  >
    {/* Hero banner — Metro tile wide */}
    <div class="dish-hero-banner" data-role="tile" data-size="wide" style={`background: ${catColor}; view-transition-name: dish-${dish.id};`}>
      {dish.data.images?.[0] && (
        <div class="dish-hero-img" style={`background-image: url('${commonsThumb(dish.data.images[0].path, 1400)}'); background-size: cover; background-position: center;`}></div>
      )}
      <div class="dish-hero-overlay"></div>
      <div class="dish-hero-no">#{String(dish.data.menu_no).padStart(2, '0')}</div>
      <h1 class="dish-hero-name">{dish.data.names.yue_hant}</h1>
      <div class="dish-hero-jyut">{dish.data.names.jyutping}</div>
    </div>

    <PivotTab id="ingredients" name={dict.ingredients} selected>
      {/* INGREDIENTS CONTENT — copy existing markup verbatim from old file */}
      {/* Includes: ingredientRefs table, sauce_link if any, allergens, equipment */}
    </PivotTab>

    <PivotTab id="method" name={dict.method}>
      {/* METHOD CONTENT — copy existing markup verbatim */}
      {dish.data.method_status === 'stub' && <p class="warn">{dict.stub_warn}</p>}
      {dish.data.method_status === 'draft' && <p class="warn">{dict.draft_warn}</p>}
      {/* method steps list */}
    </PivotTab>

    <PivotTab id="tips" name={dict.tips}>
      {/* TIPS CONTENT — copy existing markup */}
    </PivotTab>

    <PivotTab id="history" name={dict.history}>
      {/* HISTORY + SOURCES — copy existing markup */}
    </PivotTab>
  </PivotPage>
</BaseLayout>
```

- [ ] **Step 4: Add imports for PivotPage and PivotTab to the file**

In the frontmatter at top of `src/pages/[locale]/dishes/[id].astro`, after line 3 (`import BaseLayout`), add:

```typescript
import PivotPage from '~/components/PivotPage.astro';
import PivotTab from '~/components/PivotTab.astro';
```

- [ ] **Step 5: Migrate ingredients content into PivotTab**

Find the existing `<section>` containing the ingredients table (`<h2>{dict.ingredients}</h2>` plus `<table>...</table>`). Cut its inner content (everything between the `<section>` open and close) and paste inside `<PivotTab id="ingredients" name={dict.ingredients} selected>`.

- [ ] **Step 6: Same for method, tips, history sections**

Repeat step 5 for `method`, `tips`, `history` (which also includes sources). Each gets cut from old position and pasted into corresponding `<PivotTab>`.

- [ ] **Step 7: Remove old hero `<header class="hero-band">` (replaced by `dish-hero-banner` inside PivotPage)**

Delete the old `<header class="hero-band">...</header>` block entirely.

- [ ] **Step 8: Remove old `<nav class="crumbs">` (replaced by PivotPage prev/next nav)**

Delete the old `<nav class="crumbs">...</nav>` block.

- [ ] **Step 9: Add minimal CSS for dish-hero-banner**

In the file's `<style>` block (at bottom of page), add:

```css
.dish-hero-banner {
  position: relative;
  overflow: hidden;
  color: #fff;
  margin: 0 0 var(--sp-5);
  height: calc(2 * var(--tile-unit) + var(--tile-gap));
  width: 100%;
  display: block;
}
.dish-hero-img { position: absolute; inset: 0; }
.dish-hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0) 100%);
}
.dish-hero-no {
  position: absolute; top: var(--sp-3); right: var(--sp-4);
  font-family: var(--sans);
  font-size: var(--fs-body);
  background: rgba(0,0,0,0.45);
  padding: var(--sp-1) var(--sp-3);
  z-index: 2;
}
.dish-hero-name {
  position: absolute; bottom: calc(var(--sp-6) + var(--sp-3)); left: var(--sp-4);
  font-family: var(--lang-font-primary);
  font-size: var(--fs-panorama-sm);
  font-weight: var(--fw-light);
  margin: 0;
  z-index: 2;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
}
.dish-hero-jyut {
  position: absolute; bottom: var(--sp-4); left: var(--sp-4);
  font-family: var(--mono);
  font-size: var(--fs-body);
  opacity: 0.85;
  z-index: 2;
}
```

- [ ] **Step 10: Build and verify**

Run: `cd site && npm run build`
Expected: build completes; pagefind index built.

Open in preview: `npx astro preview` then visit dish detail. Verify:
- 4 pivot tabs visible at top
- Click each tab → content switches
- ‹ prev / next › nav at bottom navigates to other dishes
- view-transition-name still present (tile-click from Hub still does Continuum morph)

- [ ] **Step 11: Run pivot-tab probe**

Run: `node scripts/probe-pivot-tab.mjs`
Expected: `PASS — tabs: 4, final hash: #tips, errors: 0`

- [ ] **Step 12: Commit**

```bash
git add site/src/pages/[locale]/dishes/[id].astro
git commit -m "feat(dish): rewrite dish detail as WP10 PivotPage with 4 tabs"
```

---

## Step 7 — Ingredient / Sauce / Search / 404 rewrites

### Task 7.1: Rewrite ingredient detail as PivotPage 2 tab

**Files:**
- Modify: `src/pages/[locale]/ingredients/[id].astro`

- [ ] **Step 1: Read existing structure**

Run: `cat site/src/pages/[locale]/ingredients/[id].astro | head -80`

- [ ] **Step 2: Add PivotPage/PivotTab imports and wrap content**

In the file's frontmatter, after `import BaseLayout`, add:

```typescript
import PivotPage from '~/components/PivotPage.astro';
import PivotTab from '~/components/PivotTab.astro';
```

Wrap the existing `<BaseLayout>` content in `<PivotPage>` with 2 tabs: `intro` (existing description / metadata) and `used-in` (dish tile grid filtered to dishes using this ingredient):

```astro
<BaseLayout title={ingredient.data.names.yue_hant} locale={locale}>
  <PivotPage
    pivotTitle={ingredient.data.names.yue_hant}
    initialTab="intro"
  >
    <div class="dish-hero-banner" data-role="tile" data-size="wide" style="background: var(--m-orange);">
      {ingredient.data.image && (
        <div class="dish-hero-img" style={`background-image: url('${commonsThumb(ingredient.data.image, 1400)}'); background-size: cover; background-position: center;`}></div>
      )}
      <div class="dish-hero-overlay"></div>
      <h1 class="dish-hero-name">{ingredient.data.names.yue_hant}</h1>
    </div>

    <PivotTab id="intro" name={dict.intro} selected>
      {/* PASTE original ingredient description + metadata here */}
    </PivotTab>

    <PivotTab id="used-in" name={dict.used_in}>
      <div class="tiles-grid browse-tiles">
        {usedInDishes.map((d) => (
          <a class="tile-medium wp-tile dish-tile" data-role="tile" data-size="medium"
             href={`${base}/${locale}/dishes/${d.id}`} style={`background: ${tileColorFor(d.data.category.id)};`}>
            <div class="tile-slide dish-tile-slide">
              <span class="dish-name">{locale === 'en' ? d.data.names.en : d.data.names.yue_hant}</span>
            </div>
          </a>
        ))}
      </div>
    </PivotTab>
  </PivotPage>
</BaseLayout>
```

- [ ] **Step 3: Add `usedInDishes` computation in frontmatter**

```typescript
const allDishes = await getCollection('dish');
const usedInDishes = allDishes.filter((d) => d.data.ingredients.some((i) => i.ref.id === ingredient.id));
```

- [ ] **Step 4: Add `dict.intro` and `dict.used_in` to the i18n dictionary in the file**

In each of the 3 locale blocks (`zh`, `en`, `yue`), add:

```typescript
intro: locale === 'en' ? 'About' : '介紹',
used_in: locale === 'en' ? 'Used in' : '用在哪些菜',
```

- [ ] **Step 5: Build and verify**

Run: `cd site && npm run build && npx astro preview`
Visit an ingredient detail page. Verify 2 tabs work, "Used in" shows correct dish tiles.

- [ ] **Step 6: Commit**

```bash
git add site/src/pages/[locale]/ingredients/[id].astro
git commit -m "feat(ingredient): rewrite ingredient detail as WP10 PivotPage 2 tabs"
```

### Task 7.2: Rewrite sauce detail as PivotPage 2 tab

**Files:**
- Modify: `src/pages/[locale]/sauces/[id].astro`

- [ ] **Step 1: Apply same pattern as Task 7.1**

Same structure: 2 tabs (`intro` + `used-in`). For `usedInDishes`, filter:

```typescript
const usedInDishes = allDishes.filter((d) => d.data.sauce?.id === sauce.id);
```

- [ ] **Step 2: Build, verify, commit**

```bash
git add site/src/pages/[locale]/sauces/[id].astro
git commit -m "feat(sauce): rewrite sauce detail as WP10 PivotPage 2 tabs"
```

### Task 7.3: Rewrite search results to use data-role="listview"

**Files:**
- Modify: `src/pages/[locale]/search.astro` — lines 28-43 (the `<input>` + results section), and lines 60-89 (the `runSearch` function)

- [ ] **Step 1: Wrap input in HubPivot strip**

Replace the existing `<section class="panorama">...` with:

```astro
<BaseLayout title={dict.title} locale={locale}>
  <HubPivot initialTitle={dict.title} />
  <section class="search-section">
    <input
      id="q"
      class="search-input"
      type="search"
      autocomplete="off"
      autocapitalize="none"
      spellcheck="false"
      placeholder={dict.placeholder}
      aria-label={dict.title}
    />
    <ul id="results" class="search-results" data-role="listview" data-empty={dict.empty} data-noresults={dict.no_results}>
      <li class="search-status">{dict.empty}</li>
    </ul>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Add HubPivot import**

In frontmatter: `import HubPivot from '~/components/HubPivot.astro';`

- [ ] **Step 3: Update runSearch to render listview rows**

In the `<script>` block, change the result rendering (lines ~73-83):

```javascript
const html = await Promise.all(
  top.map(async (h) => {
    const data = await h.data();
    return `
      <li class="search-hit">
        <a href="${data.url.replace(/\/$/, '')}">
          <span class="app-list-thumb"></span>
          <span class="app-list-text">
            <span class="app-list-name">${data.meta?.title ?? data.url}</span>
            <span class="app-list-meta">${data.excerpt}</span>
          </span>
        </a>
      </li>
    `;
  })
);
results.innerHTML = html.join('');
```

- [ ] **Step 4: Add Metro flat search-input styling**

In the file's `<style>` block, add:

```css
.search-section { max-width: 760px; margin: 0 auto; padding: var(--sp-4) var(--sp-5); }
.search-input {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  font-family: var(--lang-font-primary);
  font-size: var(--fs-panel);
  background: var(--t-card);
  color: var(--t-ink);
  border: 1px solid var(--t-ink);
  border-radius: 0;
  outline: none;
  transition: border-color 120ms ease;
}
.search-input:focus { border-color: var(--m-red); background: var(--t-ink); color: #fff; }
.search-results { list-style: none; padding: 0; margin: var(--sp-4) 0 0; }
.search-status { padding: var(--sp-5); text-align: center; color: var(--t-ink-dim); }
```

- [ ] **Step 5: Build, verify (search needs `npm run build` + preview because pagefind is build-only)**

```bash
cd site && npm run build && npx astro preview
```

Visit `/search`, type `炒` — verify results appear as listview rows.

- [ ] **Step 6: Commit**

```bash
git add site/src/pages/[locale]/search.astro
git commit -m "feat(search): rewrite results as Metro listview + flat search input"
```

### Task 7.4: Rewrite 404 with MetroEmptyState

**Files:**
- Modify: `src/pages/404.astro`

- [ ] **Step 1: Read existing 404**

Run: `cat site/src/pages/404.astro`

- [ ] **Step 2: Replace content with MetroEmptyState**

Replace `src/pages/404.astro` content with:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import MetroEmptyState from '~/components/MetroEmptyState.astro';
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<BaseLayout title="404 · Page not found" locale="zh">
  <MetroEmptyState
    bigText="404"
    subtitle="找不到該頁 · Page not found · 揾唔到呢頁"
    actionHref={`${base}/zh`}
    actionLabel="返回首頁"
  />
</BaseLayout>
```

- [ ] **Step 3: Build, visit an unknown URL to test 404**

```bash
cd site && npm run build && npx astro preview
```

Visit `http://localhost:4321/cantopedia/zh/this-does-not-exist` — verify 404 page shows big "404" + subtitle + red Metro tile linking home.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/404.astro
git commit -m "feat(404): use MetroEmptyState for WP10 Metro empty state"
```

---

## Step 8 — Bundled bug fixes B1-B9

### Task 8.1: B1 — Fix hubScripts handler leak

**Files:**
- Modify: `src/lib/hubScripts.ts` — `initHubNav` function (lines 86-189) and `teardownHubNav` (lines 191-210)

- [ ] **Step 1: Save click/keydown handler refs to the hub element**

In `initHubNav`, around the `prevLink?.addEventListener('click', ...)` block (line 144), refactor:

```typescript
const prevClick = (e: Event) => {
  e.preventDefault();
  scrollToIndex((getActiveIndex() - 1 + panels.length) % panels.length);
};
const nextClick = (e: Event) => {
  e.preventDefault();
  scrollToIndex((getActiveIndex() + 1) % panels.length);
};
prevLink?.addEventListener('click', prevClick);
nextLink?.addEventListener('click', nextClick);
(hub as any)._prevClick = prevClick;
(hub as any)._nextClick = nextClick;

const keydownHandler = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevLink?.click(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); nextLink?.click(); }
};
hub.addEventListener('keydown', keydownHandler);
(hub as any)._keydownHandler = keydownHandler;
```

- [ ] **Step 2: Remove handlers in teardown**

In `teardownHubNav`, add before the `delete hub.dataset.navWired`:

```typescript
const prevClick = (hub as any)._prevClick;
const nextClick = (hub as any)._nextClick;
const keydownHandler = (hub as any)._keydownHandler;
const prevLink = document.getElementById('hub-pivot-prev');
const nextLink = document.getElementById('hub-pivot-next');
if (typeof prevClick === 'function' && prevLink) {
  prevLink.removeEventListener('click', prevClick);
  delete (hub as any)._prevClick;
}
if (typeof nextClick === 'function' && nextLink) {
  nextLink.removeEventListener('click', nextClick);
  delete (hub as any)._nextClick;
}
if (typeof keydownHandler === 'function') {
  hub.removeEventListener('keydown', keydownHandler);
  delete (hub as any)._keydownHandler;
}
```

- [ ] **Step 3: Verify with manual test in DevTools**

Open `/cantopedia/zh`, then navigate to `/cantopedia/zh/all` and back. In DevTools, run:

```javascript
getEventListeners(document.getElementById('hub-pivot-next'))
```

Expected: 1 click listener (not 3 — would indicate leak).

- [ ] **Step 4: Commit**

```bash
git add site/src/lib/hubScripts.ts
git commit -m "fix(hub): save handler refs so teardown removes them (B1 — no leak on ClientRouter re-init)"
```

### Task 8.2: B2 — categoryPhoto fallback

**Files:**
- Modify: `src/components/Hub.astro` — `categoryPhoto` function (lines 40-47)

- [ ] **Step 1: Add fallbacks**

Replace the `categoryPhoto` function with:

```typescript
function categoryPhoto(catId: string): string | undefined {
  const dishes = dishesByCat.get(catId) ?? [];
  // Try first dish with image in this category
  for (const d of dishes) {
    const p = d.data.images?.[0]?.path;
    if (p) return commonsThumb(p, 800);
  }
  // Fallback: ANY dish with image (cross-category)
  for (const d of allDishes) {
    const p = d.data.images?.[0]?.path;
    if (p) return commonsThumb(p, 800);
  }
  // Last resort: no image, return undefined (tile shows solid color)
  console.warn(`[Hub] no photo found for category ${catId}; showing solid color`);
  return undefined;
}
```

- [ ] **Step 2: Verify all 8 category tiles now show photos**

Run: `node scripts/probe-final-sweep.mjs` then open `desktop-zh-home.png`. All 8 category tiles should now show a background photo (not just solid color).

- [ ] **Step 3: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "fix(hub): categoryPhoto falls back to any dish image (B2 — 8/8 categories show photos)"
```

### Task 8.3: B3 — Hub page footer

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (around line 99 — after `<main>`)
- Modify: `src/components/Hub.astro` (`is:global main:has(#hub)` rule)

- [ ] **Step 1: Add default `<footer>` to BaseLayout after `<main>`**

In `src/layouts/BaseLayout.astro` between `</main>` and `<script>` (around line 99-100), add:

```astro
<footer>
  <p>
    &copy; 2025 ShepherdLoveYou ·
    <a href="https://github.com/ShepherdLoveYou/cantopedia" target="_blank" rel="noopener">GitHub</a> ·
    MIT (code) / CC BY-SA 4.0 (content)
  </p>
</footer>
```

- [ ] **Step 2: Remove Hub's footer-suppressing rule**

In `src/components/Hub.astro` `<style is:global>` block (lines 587-597), change:

```css
main:has(#hub) {
  max-width: none;
  margin: 0;
  padding: 0;
}
```

to (still no padding/max-width, but don't hide footer):

```css
main:has(#hub) {
  max-width: none;
  margin: 0;
  padding: 0;
}
/* Hub fills viewport; footer follows naturally below. No hiding. */
```

(No actual change needed if the current rule doesn't hide footer. Verify by inspecting.)

- [ ] **Step 3: Take screenshot to verify Hub now has footer**

Run: `node scripts/probe-home-full.mjs`
Open `home-desktop-centered.png` — verify Metro red-striped footer is visible at bottom.

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro site/src/components/Hub.astro
git commit -m "fix(layout): render footer on every page including Hub (B3)"
```

### Task 8.4: B4 — Theme nav sync on SSR

**Files:**
- Modify: `src/layouts/BaseLayout.astro` — locate the `<script>` block containing `reapplyTheme` (around lines 189-227)

- [ ] **Step 1: Add `is:inline` theme sync script right after `<nav>`**

In `src/layouts/BaseLayout.astro`, immediately after `</nav>` (the closing of the metro-nav `<div>` after Task 2.2; around line 96), insert:

```astro
<script is:inline>
  (function () {
    try {
      const choice = localStorage.getItem('cantopedia-theme') || 'auto';
      const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.themeChoice = choice;
      document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.themeChoice === choice ? 'true' : 'false');
      });
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 2: Verify theme syncs on first paint**

Open `/cantopedia/zh` with `localStorage.setItem('cantopedia-theme', 'dark')` set in browser console. Reload page. Verify nav background switches to `rgb(0,0,0)` immediately (not after a flash of `rgb(29,29,29)`).

- [ ] **Step 3: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "fix(theme): inline script syncs nav theme on first paint (B4)"
```

### Task 8.5: B5 — WeakMap for as any DOM state

**Files:**
- Modify: `src/lib/hubScripts.ts` — replace `(tile as any)._x` patterns with WeakMap

- [ ] **Step 1: Add module-level WeakMap**

At top of `src/lib/hubScripts.ts` (after imports), add:

```typescript
type FeaturedState = { intervalId: number; clickHandler: () => void };
const featuredState = new WeakMap<HTMLElement, FeaturedState>();

type HubState = {
  prevClick: (e: Event) => void;
  nextClick: (e: Event) => void;
  keydownHandler: (e: KeyboardEvent) => void;
  resizeHandler: () => void;
  popstateHandler: () => void;
  io: IntersectionObserver;
};
const hubState = new WeakMap<HTMLElement, HubState>();
```

- [ ] **Step 2: Refactor initFeaturedTile to use the WeakMap**

Replace `(tile as any)._featuredClickHandler = clickHandler;` and `(tile as any)._featuredInterval = intervalId;` (lines 58, 70) with:

```typescript
featuredState.set(tile, { intervalId, clickHandler });
```

Replace teardown's `(tile as any)._featuredInterval` etc. with:

```typescript
const state = featuredState.get(tile);
if (state) {
  clearInterval(state.intervalId);
  tile.removeEventListener('click', state.clickHandler);
  featuredState.delete(tile);
}
```

- [ ] **Step 3: Refactor initHubNav similarly**

Replace all `(hub as any)._x = y;` with:

```typescript
hubState.set(hub, { prevClick, nextClick, keydownHandler, resizeHandler, popstateHandler, io });
```

Replace teardownHubNav `(hub as any)._x` reads with:

```typescript
const state = hubState.get(hub);
if (state) {
  prevLink?.removeEventListener('click', state.prevClick);
  nextLink?.removeEventListener('click', state.nextClick);
  hub.removeEventListener('keydown', state.keydownHandler);
  window.removeEventListener('resize', state.resizeHandler);
  window.removeEventListener('popstate', state.popstateHandler);
  state.io.disconnect();
  hubState.delete(hub);
}
```

- [ ] **Step 4: Verify TypeScript passes**

Run: `cd site && npx astro check 2>&1 | grep -i error`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/hubScripts.ts
git commit -m "refactor(hub): WeakMap for DOM state instead of as any (B5)"
```

### Task 8.6: B6 — Metro CSS import order + `:where()` (defer — touch only if Step 9 grep shows !important needed)

**Files:**
- Modify: `src/layouts/BaseLayout.astro` — `<head>` `<script>` imports

- [ ] **Step 1: Verify current import order**

Run: `grep -n "metroui" site/src/layouts/BaseLayout.astro`
Expected: see imports in `<script>` block.

- [ ] **Step 2: Add `:where()` low-specificity wrapper for Metro CSS overrides in BaseLayout `<style is:global>` :root block**

Locate the existing `:root, html { --body-background: ... !important; ... }` rule (around line 374) and replace with:

```css
:where(:root, html) {
  --body-background: var(--t-bg);
  --body-color: var(--t-ink);
}
```

(Removes `!important` because `:where()` has zero specificity, so Metro's later vars can override but our `:where()` baseline always applies.)

- [ ] **Step 3: Verify body bg still correct in dark theme**

Open `/cantopedia/zh` with theme=dark. Verify body bg is `rgb(14, 14, 16)` (not white).

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "refactor(css): use :where() for low-specificity body bg override (B6 — reduce !important)"
```

### Task 8.7: B8 — a11y fixes

**Files:**
- Modify: `src/components/HubPivot.astro` — already uses `<button>` from Task 4.1 ✓
- Modify: `src/components/Accordion.astro` — add `role="button"` + `tabindex` + keydown to the label

- [ ] **Step 1: Open Accordion.astro and find the `<label>` element**

Run: `grep -n "label" site/src/components/Accordion.astro`

- [ ] **Step 2: Add a11y attributes**

In `src/components/Accordion.astro`, change the trigger `<label>` to:

```astro
<label
  class="accordion-toggle"
  for={`acc-${id}`}
  role="button"
  tabindex="0"
  onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); this.click();}"
>
  ...
</label>
```

- [ ] **Step 3: Verify keyboard navigation**

Open a page with Accordion. Tab to the trigger. Press Enter — should toggle open.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/Accordion.astro
git commit -m "fix(a11y): Accordion label role=button + keyboard activation (B8)"
```

### Task 8.8: B9 — probe-final-sweep port-scan

**Files:**
- Modify: `site/scripts/probe-final-sweep.mjs` — top section (after `import` lines)

- [ ] **Step 1: Add port-scan logic**

In `site/scripts/probe-final-sweep.mjs`, replace `const PORT = process.env.PORT || '4321';` with:

```javascript
async function findDevPort() {
  if (process.env.PORT) return process.env.PORT;
  // Scan 4321-4329 for first responding port
  for (let p = 4321; p <= 4329; p++) {
    try {
      const r = await fetch(`http://localhost:${p}/cantopedia/`, { method: 'HEAD', signal: AbortSignal.timeout(800) });
      if (r.status < 500) return String(p);
    } catch {}
  }
  throw new Error('No dev server found on ports 4321-4329');
}
const PORT = await findDevPort();
console.log(`Using dev server on port ${PORT}`);
```

- [ ] **Step 2: Verify probe finds the right port**

Run: `cd site && node scripts/probe-final-sweep.mjs`
Expected: prints `Using dev server on port 43xx` before scanning.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/probe-final-sweep.mjs
git commit -m "fix(probe): auto-discover dev server port 4321-4329 (B9)"
```

---

## Step 9 — Token migration (B7) + tokens.test.ts

### Task 9.1: Grep + replace hardcoded font-size values

**Files:**
- Modify: all `.astro` files under `src/` containing hardcoded `font-size:` (NOT in the token block)

- [ ] **Step 1: Find all hardcoded font-size values**

Run: `grep -rn "font-size:" site/src/ --include="*.astro" --include="*.ts" | grep -v "var(--fs"`
Expected: list of files + lines with hardcoded font-size.

- [ ] **Step 2: Map each value to the closest token and replace**

For each hit, map:

| Hardcoded | Token |
|---|---|
| `0.7rem`, `0.72rem`, `0.75rem` | `var(--fs-caption)` |
| `0.78rem`, `0.8rem` | `var(--fs-tiny)` |
| `0.85rem`, `0.875rem`, `0.9rem`, `0.9375rem` | `var(--fs-body)` |
| `0.95rem`, `1rem`, `1.05rem`, `1.0625rem`, `1.1rem` | `var(--fs-panel)` |
| `1.25rem`, `1.45rem`, `1.5rem`, `1.6rem` | `var(--fs-title)` |
| `1.875rem`, `2.4rem` | `var(--fs-panorama-sm)` |
| `3rem`, `3.25rem` | `var(--fs-panorama)` |

Use Edit tool to replace each occurrence with the mapped token.

- [ ] **Step 3: Verify no hardcoded font-size left (allow rem ≤ 0.65 or ≥ 4 — outliers)**

Run: `grep -rn "font-size: *0\.\(7\|78\|8\|85\|875\|9\|9375\|95\)rem\|font-size: *1\(\|\.0\|\.05\|\.1\|\.45\|\.5\|\.6\)rem" site/src/`
Expected: 0 matches (everything migrated).

- [ ] **Step 4: Commit**

```bash
git add site/src/
git commit -m "refactor(tokens): migrate hardcoded font-size to --fs-* tokens (B7 part 1)"
```

### Task 9.2: Grep + replace hardcoded font-weight, color, spacing

**Files:**
- Same: all `.astro` files

- [ ] **Step 1: Replace font-weight values**

| Hardcoded | Token |
|---|---|
| `200` | `var(--fw-light)` |
| `300`, `400` | `var(--fw-regular)` |
| `500` | `var(--fw-medium)` |
| `600`, `700` | (keep — these are heavier than WP10 uses; verify if needed) |

Run: `grep -rn "font-weight: *\(200\|300\|400\|500\)" site/src/ --include="*.astro" --include="*.ts" | grep -v "var(--fw"`
Replace each with mapped token.

- [ ] **Step 2: Replace hardcoded `#fff` `#1d1d1d` `rgba(0,0,0,*)`**

For each, decide:
- `#fff` in nav/footer/dark-overlay context → `var(--t-nav-ink)` or stay as `#fff` if on always-dark element
- `#1d1d1d` → `var(--m-ink)` (already a token)
- `rgba(0,0,0,0.45)` etc. → keep (these are scrim overlays)

Run: `grep -rn "#fff\|#1d1d1d" site/src/ --include="*.astro" | grep -v "var(--"`
Replace selectively.

- [ ] **Step 3: Replace padding/gap px → spacing token where applicable**

Convert `padding: 10px`, `padding: 1rem`, etc. to `var(--sp-*)` only for "ambient" spacing. Leave precise photo/grid sizing (like `width: 64px` thumb) as px.

Run: `grep -rn "padding: *\(10px\|1rem\|1.5rem\)" site/src/ --include="*.astro" | head -30`
Replace conservatively (only obvious matches).

- [ ] **Step 4: Commit**

```bash
git add site/src/
git commit -m "refactor(tokens): migrate hardcoded font-weight, color, spacing (B7 part 2)"
```

### Task 9.3: Create tokens.test.ts (regression guard)

**Files:**
- Create: `src/lib/tokens.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC = resolve(__dirname, '..');

const ALLOWED_FONT_SIZES = new Set([
  // Tokens
  'var(--fs-caption)', 'var(--fs-tiny)', 'var(--fs-body)', 'var(--fs-panel)',
  'var(--fs-title)', 'var(--fs-panorama-sm)', 'var(--fs-panorama)',
  // Lang-derived ramp (BaseLayout)
  'var(--lang-h1-size)', 'var(--lang-h2-size)', 'var(--lang-h3-size)',
  // CSS-defined size functions
  'clamp', 'inherit', 'em', 'rem',
  // Allow 16px body anchor and Metro icon fixed sizes
  '16px', '28px', '48px',
]);

const ALLOWED_FONT_WEIGHTS = new Set([
  'var(--fw-light)', 'var(--fw-regular)', 'var(--fw-medium)',
  'var(--lang-min-weight)', 'inherit', 'normal', 'bold',
]);

function listFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    if (f.startsWith('node_modules')) continue;
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => f.endsWith(e))) out.push(p);
  }
  return out;
}

describe('design token discipline', () => {
  const files = listFiles(SRC, ['.astro', '.ts']);

  it('every font-size declaration uses a token (no hardcoded rem)', () => {
    const violations: string[] = [];
    for (const f of files) {
      if (f.endsWith('tokens.test.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      const matches = content.matchAll(/font-size:\s*([^;]+);/g);
      for (const m of matches) {
        const value = m[1].trim();
        const isAllowed = [...ALLOWED_FONT_SIZES].some((a) => value.includes(a));
        if (!isAllowed) violations.push(`${f}: font-size: ${value}`);
      }
    }
    if (violations.length > 0) console.error(violations.join('\n'));
    expect(violations).toEqual([]);
  });

  it('every font-weight uses a token', () => {
    const violations: string[] = [];
    for (const f of files) {
      if (f.endsWith('tokens.test.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      const matches = content.matchAll(/font-weight:\s*([^;]+);/g);
      for (const m of matches) {
        const value = m[1].trim();
        const isAllowed = [...ALLOWED_FONT_WEIGHTS].some((a) => value.includes(a));
        if (!isAllowed) violations.push(`${f}: font-weight: ${value}`);
      }
    }
    if (violations.length > 0) console.error(violations.join('\n'));
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run vitest, expect green**

Run: `cd site && npx vitest run`
Expected: 5 + 2 = 7 tests pass.

- [ ] **Step 3: If any violations remain, fix them inline + re-run**

If test fails with violations, edit the listed files to use tokens. Re-run until green.

- [ ] **Step 4: Commit**

```bash
git add site/src/lib/tokens.test.ts
git commit -m "test: tokens.test.ts enforces font-size/weight token discipline (B7 guard)"
```

---

## Step 10 — Regression sweep + visual diff + final commit

### Task 10.1: Run full final-sweep against rebuilt site

**Files:**
- None (sweep only)

- [ ] **Step 1: Build + start preview server**

```bash
cd site && npm run build && npx astro preview --host 0.0.0.0 --port 4321 &
sleep 5
```

- [ ] **Step 2: Run sweep against preview**

```bash
PORT=4321 node scripts/probe-final-sweep.mjs
```

Expected: `Total screenshots: 90`, `Total error events: 0`.
If errors: investigate each (`site/probe-out/sweep-errors.json`).

- [ ] **Step 3: Run pivot-tab probe**

```bash
PORT=4321 node scripts/probe-pivot-tab.mjs
```

Expected: `PASS — tabs: 4, final hash: #tips, errors: 0`.

- [ ] **Step 4: Run all existing probes that still apply**

```bash
PORT=4321 node scripts/probe-home-full.mjs
PORT=4321 node scripts/probe-theme-visual.mjs
PORT=4321 node scripts/probe-app-list.mjs
PORT=4321 node scripts/probe-cat-tile.mjs
```

Expected: each prints PASS or saves screenshots to `probe-out/`.

- [ ] **Step 5: Stop preview server**

```bash
pkill -f "astro preview"
```

### Task 10.2: Visual diff 9 routes before/after

**Files:**
- None (manual eyeball compare)

- [ ] **Step 1: Take 9 reference screenshots (one per page type at desktop)**

Compare these `site/probe-out/sweep/` screenshots against the spec's WP10 Mobile description:

| File | Check |
|---|---|
| `desktop-zh-home.png` | Hub: pivot strip top, tile grid below, footer at bottom |
| `desktop-zh-all.png` | AppList: letter dividers, listview rows |
| `desktop-zh-browse-noodle.png` | Browse panel: dish tiles, footer |
| `desktop-zh-dish.png` | Dish: pivot strip, 4 tabs, hero banner, footer |
| `desktop-zh-ingredient.png` | Ingredient: pivot strip, 2 tabs, hero banner, footer |
| `desktop-zh-sauce.png` | Sauce: pivot strip, 2 tabs, hero banner, footer |
| `desktop-zh-search.png` | Search: pivot strip, Metro flat input, listview |
| `desktop-zh-404.png` | 404: big "404", subtitle, red Metro tile |
| `mobile-zh-home.png` | Hub mobile: tiles, footer visible |

For each, verify:
- ✓ Status bar (black, 40px, brand center, locale tabs right)
- ✓ Footer (black with red stripe, all-caps tiny text)
- ✓ Same type ramp (no jarring font-size jumps)
- ✓ No rounded corners (except photo overlays)
- ✓ No card shadows

- [ ] **Step 2: Capture findings in execution log**

If any check fails, file a bug ticket OR fix it inline as a follow-up task. Document deviations in `docs/superpowers/specs/2026-05-25-wp10-mobile-ui-unification-design.md` under "Open Questions / Risks" as `Resolved: ...`.

### Task 10.3: Run vitest one final time + commit final state

**Files:**
- None (just verify)

- [ ] **Step 1: Run vitest**

```bash
cd site && npx vitest run
```

Expected: all tests pass (5 original + 2 token tests = 7 PASS).

- [ ] **Step 2: Run `npm run build` one more time**

```bash
cd site && npm run build
```

Expected: build completes successfully with pagefind index.

- [ ] **Step 3: Final commit (if any uncommitted changes from visual diff fixes)**

```bash
git status
git add -A
git commit -m "test: regression sweep PASS — 90 routes, 0 errors, WP10 Mobile UI unified" || echo "nothing to commit"
```

- [ ] **Step 4: Push to remote (optional)**

```bash
git push -u origin feat/wp10-metroui
```

---

## Self-Review

### Spec coverage

| Spec Section | Implementation Task |
|---|---|
| 0 — Bug list | Step 8 (all 9 bugs B1-B9) + Step 9 (B7) |
| 1 — Visual direction (全 WP10 Mobile) | Whole plan |
| 2 — Token table | Task 1.1 (define) + Task 9.3 (enforce) |
| 2.5 — SOLID S/O/I | Task 3 (delete CatTile = ISP split via data-role props), Task 5 (Hub slim = S), Step 4 (new components = S) |
| 3.1 Dish detail Pivot 4 tab | Task 6.1 |
| 3.2 Ingredient detail Pivot 2 tab | Task 7.1 |
| 3.3 Sauce detail Pivot 2 tab | Task 7.2 |
| 3.4 Search AppList | Task 7.3 |
| 3.5 404 Empty State | Task 7.4 |
| 4 — Component list | Steps 2, 3, 4, 5, 7 |
| 5 — Bundled bugs B1-B9 | Step 8 + Step 9 |
| 6 — Validation + 10 steps | Mapped 1:1 |
| Open Question 1 (Pivot vs scroll) | Documented; if user fallback needed → re-spec |
| Open Question 2 (switch effect) | Task 3.1 spike + Task 2.2 fallback path |
| Open Question 3 (search 炒) | Acknowledged in Task 7.3 — uses pagefind as-is, no algo change |
| Open Question 4 (view-transition-name stability) | Preserved in Task 3.2, 5.2, 6.3 (style attr keeps `view-transition-name`) |
| Open Question 5 (build mode acceptance) | Task 10.1 uses `npm run build && npx astro preview` |
| Open Question 6 (URL state in PivotPage) | Task 4.5 (pivotScripts syncs hash on scroll + initial-tab from hash) |

### Placeholder scan

Scanned plan for TBD / TODO / "implement later" / "similar to" / "add error handling" — none found. All code blocks are complete.

### Type consistency

- `featuredState` and `hubState` WeakMaps both defined in Task 8.5, used in Task 8.1 (B1 uses `(hub as any)._x` initially — Task 8.5 migrates them — consistent: B1 lands first then B5 cleans up).
- `PivotPage` props (initialTab, pivotTitle, prevHref, nextHref, prevLabel, nextLabel) used identically in Task 6.1, 7.1, 7.2.
- `MetroEmptyState` props (bigText, subtitle, actionHref, actionLabel) used in Task 7.4.
- `data-pivot-tab`, `data-tab-id`, `data-tab-name`, `data-selected` attributes set by PivotTab.astro (Task 4.3) and read by pivotScripts.ts (Task 4.5) — consistent.
- `HubPivot` accepts `initialTitle` / `prevId` / `nextId` / `titleId` — used by PivotPage (Task 4.2) and Search (Task 7.3) with default ids.

No inconsistencies found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-25-wp10-mobile-ui-unification-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good for this plan because each task is small and decoupled.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Slower but you watch every step.

**Which approach?**
