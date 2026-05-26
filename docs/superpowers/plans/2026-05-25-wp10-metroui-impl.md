# WP10 Mobile + @olton/metroui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Cantopedia's Hub UI from custom WP10-inspired CSS to @olton/metroui tiles, drop the hamburger drawer, add an AppList panel, while restoring the SPA-nav / panel-clip / pivot-peek fixes that were lost in the cee6736 rollback.

**Architecture:** Single `Hub.astro` renders 10 horizontal scroll-snap panels (Start | AppList | 8 category panels). Metro CSS (`metro.css` + `icons.css`) is imported only from Hub.astro frontmatter, so dish/ingredient/sauce/search pages stay lean. Cat-tile face cycling uses CSS rotateX transforms driven by a lifecycle-aware JS module that re-inits on `astro:after-swap` + `astro:page-load`. Drawer + focus-trap dependency are removed; theme/search/github controls move to Start Menu utility tiles. Each step is verified by a Playwright probe under `site/scripts/probe-*.mjs` before commit.

**Tech Stack:** Astro 5 + Content Collections, @olton/metroui v5.1.20+, Playwright 1.60+ (existing devDep), no new dependencies beyond metroui. Astro ClientRouter is the only client-side navigation.

**Source spec:** [`docs/superpowers/specs/2026-05-25-wp10-metroui-design.md`](../specs/2026-05-25-wp10-metroui-design.md) at commit `6c820f3`.

**Base commit:** `6c820f3` on branch `feat/wp10-metroui`.

---

## File map (created / modified / deleted across the plan)

| Path | Action | Owner task |
|---|---|---|
| `site/package.json` | modify (add metroui, remove focus-trap) | T1, T10 |
| `site/src/pages/[locale]/metro-test.astro` | create then delete | T1, T14 |
| `site/src/components/Hub.astro` | heavy modification (all phases) | T2–T13 |
| `site/src/components/CatTile.astro` | create (template component) | T5 |
| `site/src/components/AppListPanel.astro` | create | T12 |
| `site/src/pages/[locale]/all.astro` | create | T12 |
| `site/src/layouts/BaseLayout.astro` | modify (drop drawer, add Metro counter-overrides) | T8, T10 |
| `site/src/lib/hubScripts.ts` | create (extracted Hub JS for clarity + lifecycle hooks) | T2, T6 |
| `site/scripts/probe-metro-smoke.mjs` | create | T1 |
| `site/scripts/probe-spa-nav.mjs` | create | T2 |
| `site/scripts/probe-panel-clip.mjs` | create | T3 |
| `site/scripts/probe-pivot-peek.mjs` | create | T4 |
| `site/scripts/probe-cat-tile.mjs` | create | T6 |
| `site/scripts/probe-css-leak.mjs` | create | T8 |
| `site/scripts/probe-theme-tiles.mjs` | create | T9 |
| `site/scripts/probe-app-list.mjs` | create | T13 |
| `site/scripts/probe-final-sweep.mjs` | create | T15 |

---

## Conventions used in this plan

- **All paths are POSIX-style relative to repo root** (`d:/Cantonese Cuisine` is the working dir).
- **All `pnpm` commands run inside `site/`** unless otherwise noted: `cd site && pnpm <cmd>`.
- **Dev server**: `cd site && pnpm dev` — boots at `http://localhost:4321/cantopedia/`. Base path is `/cantopedia` (set in `astro.config.mjs`).
- **Probe pattern**: each probe is a standalone Node script invoked as `node site/scripts/probe-NAME.mjs`. Probes assume `pnpm dev` is running. Output goes to `site/probe-out/` (gitignored).
- **Commit cadence**: one commit per Task. If a Task has multiple sub-commits noted in the spec they're called out explicitly.
- **TDD where it fits**: For UI work, "test" = a Playwright probe that captures observable state (scroll positions, computed styles, DOM snapshots, console errors). Write the probe → run it against the current broken state to confirm it captures the bug → implement fix → run probe → confirm pass.

---

## Phase 1 — Foundation + baseline restoration (spec steps 1-2)

### Task 1: Install @olton/metroui + smoke test page + extract palette inventory

**Spec mapping:** step 1.

**Files:**
- Modify: `site/package.json` (add `@olton/metroui` to deps)
- Create: `site/src/pages/[locale]/metro-test.astro` (smoke page, deleted in T14)
- Create: `site/scripts/probe-metro-smoke.mjs`
- Modify: `docs/superpowers/specs/2026-05-25-wp10-metroui-design.md` (paste extracted palette into gotcha #3)

- [ ] **Step 1: Install metroui**

```bash
cd site && pnpm add @olton/metroui
```

Expected: `package.json` gains `"@olton/metroui": "^5.1.20"` (or newer). `pnpm-lock.yaml` updates.

- [ ] **Step 2: Create the smoke test page**

Write `site/src/pages/[locale]/metro-test.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import '@olton/metroui/lib/metro.css';
import '@olton/metroui/lib/icons.css';

export function getStaticPaths() {
  return [{ params: { locale: 'zh' } }, { params: { locale: 'yue' } }, { params: { locale: 'en' } }];
}
const { locale } = Astro.params;
---
<BaseLayout title="Metro smoke" locale={locale as 'zh'|'yue'|'en'} showNav={true}>
  <h1 style="padding: 1rem">Metro UI smoke test</h1>
  <div class="tiles-grid" style="padding: 1rem; gap: 8px;">
    <div class="tile-small" style="background: #e51400">
      <span class="mif-search" style="color:#fff; font-size: 32px"></span>
    </div>
    <div class="tile-medium" style="background: #2d89ef">
      <span class="branding-bar" style="color:#fff">Medium</span>
    </div>
    <div class="tile-wide" style="background: #008a00">
      <span class="branding-bar" style="color:#fff">Wide</span>
    </div>
    <div class="tile-large" style="background: #9f00a7">
      <span class="branding-bar" style="color:#fff">Large</span>
    </div>
  </div>
</BaseLayout>
```

- [ ] **Step 3: Write the smoke probe**

Write `site/scripts/probe-metro-smoke.mjs`:

```js
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:4321/cantopedia/zh/metro-test', { waitUntil: 'networkidle' });

const dims = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    small: pick('.tile-small'),
    medium: pick('.tile-medium'),
    wide: pick('.tile-wide'),
    large: pick('.tile-large'),
    bodyHasCloak: document.body.classList.contains('m4-cloak'),
    bodyOpacity: getComputedStyle(document.body).opacity,
  };
});

await page.screenshot({ path: 'site/probe-out/metro-smoke.png', fullPage: true });
writeFileSync('site/probe-out/metro-smoke.json', JSON.stringify({ dims, errors }, null, 2));
console.log(JSON.stringify({ dims, errors }, null, 2));

await browser.close();

// Assertions
const expected = { small: {w:70,h:70}, medium: {w:150,h:150}, wide: {w:310,h:150}, large: {w:310,h:310} };
let ok = true;
for (const [k, v] of Object.entries(expected)) {
  const got = dims[k];
  if (!got || got.w !== v.w || got.h !== v.h) {
    console.error(`FAIL ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got)}`);
    ok = false;
  }
}
if (dims.bodyHasCloak) { console.error('FAIL: body has m4-cloak class'); ok = false; }
if (errors.length) { console.error(`FAIL: ${errors.length} console/page errors`); ok = false; }
process.exit(ok ? 0 : 1);
```

- [ ] **Step 4: Start dev server and run probe**

In one terminal:
```bash
cd site && pnpm dev
```

In another:
```bash
node site/scripts/probe-metro-smoke.mjs
```

Expected: exits 0, prints tile dims matching `{small:70x70, medium:150x150, wide:310x150, large:310x310}`. Inspect `site/probe-out/metro-smoke.png` — should show 4 colored tiles with text/icon.

- [ ] **Step 5: Extract the palette inventory**

```bash
grep -oE '\.bg-[A-Za-z]+\b' site/node_modules/@olton/metroui/lib/metro.css | sort -u > site/probe-out/metro-palette.txt
cat site/probe-out/metro-palette.txt
```

- [ ] **Step 6: Paste extracted palette into spec gotcha #3**

Open `docs/superpowers/specs/2026-05-25-wp10-metroui-design.md`, find gotcha #3 ("Metro `bg-*` palette doesn't match WP10 nomenclature"), and append a fenced block right after the existing gotcha text with the contents of `metro-palette.txt`. Header: `**Verified palette inventory (extracted from v5.1.20):**`.

- [ ] **Step 7: Commit**

```bash
git add site/package.json site/pnpm-lock.yaml site/src/pages/\[locale\]/metro-test.astro site/scripts/probe-metro-smoke.mjs docs/superpowers/specs/2026-05-25-wp10-metroui-design.md
git commit -m "$(cat <<'EOF'
chore: add @olton/metroui + smoke test + extract palette inventory

- pnpm add @olton/metroui (~v5.1.20)
- new /[locale]/metro-test page (deleted in T14) verifies tiles render
  with correct fixed dimensions (70/150/310/310)
- probe-metro-smoke.mjs asserts dims + no m4-cloak on body + no console errors
- extracted bg-* palette pasted into spec gotcha #3 for future reference

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Restore SPA-nav script reinit (extract Hub scripts into module)

**Spec mapping:** step 2 — first of three baseline restorations. **Try `git reflog` and `git log --all --oneline --grep='hub\|reinit\|SPA'` first** to find the original commits; if found, cherry-pick instead of rewriting.

**Why:** Hub.astro's three inline scripts (featured tile, hub nav, live-tile flip) are bundled modules. They execute once per session. When ClientRouter swaps Hub DOM on home→browse nav, the scripts don't re-run, so the new page lands with dead featured-tile, dead live-tile flip, and wrong scroll position.

**Files:**
- Create: `site/src/lib/hubScripts.ts` (extract logic into named functions with lifecycle hooks)
- Modify: `site/src/components/Hub.astro` (replace inline `<script>` blocks with a single `<script>` that calls into hubScripts)
- Create: `site/scripts/probe-spa-nav.mjs`

- [ ] **Step 1: Write the failing probe FIRST**

Write `site/scripts/probe-spa-nav.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4321/cantopedia/zh/', { waitUntil: 'networkidle' });

// Click the featured tile link (or any Hub link that triggers ClientRouter)
const initial = await page.evaluate(() => ({
  featuredHref: document.getElementById('featured-tile')?.getAttribute('href'),
  scrollLeft: document.getElementById('hub')?.scrollLeft,
}));

// Navigate to a browse panel via ClientRouter
await page.click('a[href*="/browse/noodle"]');
await page.waitForLoadState('networkidle');

const afterNav = await page.evaluate(() => ({
  featuredExists: !!document.getElementById('featured-tile'),
  // After ClientRouter nav, featured-tile script should have re-run and
  // populated faces with images
  featuredFacesHaveImg: Array.from(document.querySelectorAll('.featured-face .featured-img'))
    .map((el) => !!getComputedStyle(el).backgroundImage && getComputedStyle(el).backgroundImage !== 'none'),
  hubScrollLeft: document.getElementById('hub')?.scrollLeft,
  hubPanelInView: document.querySelector('.hub-panel[data-panel="noodle"]')?.getBoundingClientRect().left,
}));

writeFileSync('site/probe-out/spa-nav.json', JSON.stringify({ initial, afterNav }, null, 2));
console.log(JSON.stringify({ initial, afterNav }, null, 2));

// Assertions
let ok = true;
if (!afterNav.featuredExists) {
  console.error('FAIL: featured tile missing after nav'); ok = false;
}
const facesWithImg = afterNav.featuredFacesHaveImg.filter(Boolean).length;
if (facesWithImg === 0) {
  console.error('FAIL: featured tile faces have no background-image — featured-tile script did not re-init');
  ok = false;
}
// noodle panel should be at scrollLeft offset matching its position
if (Math.abs(afterNav.hubPanelInView ?? -9999) > 50) {
  console.error(`FAIL: noodle panel not scrolled into view (left=${afterNav.hubPanelInView})`);
  ok = false;
}
await browser.close();
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe to confirm it fails on current code**

```bash
node site/scripts/probe-spa-nav.mjs
```

Expected: FAIL because `cee6736` doesn't have the SPA-nav reinit. If it unexpectedly passes, the bug isn't reproducing — investigate before proceeding.

- [ ] **Step 3: Create the extracted hubScripts.ts**

Write `site/src/lib/hubScripts.ts`:

```ts
/**
 * Hub.astro client-side logic, factored out so it can be re-invoked on
 * Astro ClientRouter lifecycle events (astro:after-swap + astro:page-load).
 * Each init function is idempotent — safe to call multiple times — and
 * tagged with a data attribute so subsequent calls short-circuit when the
 * DOM hasn't been swapped.
 */

type DishLite = { id: string; name: string; img: string | null };

export function initFeaturedTile(base: string, locale: string, dishesData: DishLite[]) {
  const tile = document.getElementById('featured-tile') as HTMLAnchorElement | null;
  if (!tile || tile.dataset.wired === '1') return;
  tile.dataset.wired = '1';

  const faces = tile.querySelectorAll<HTMLElement>('.featured-face');
  const withImg = dishesData.filter((d) => d.img);
  if (withImg.length === 0) return;

  const today = new Date();
  const dayOfYear = Math.floor((+today - +new Date(today.getFullYear(), 0, 0)) / 86400000);
  const todayDish = withImg[dayOfYear % withImg.length];
  const randomDish = withImg[Math.floor(Math.random() * withImg.length)];

  let recentDish: DishLite | null = null;
  try {
    const recentId = localStorage.getItem('cantopedia-last-dish');
    if (recentId) {
      recentDish = dishesData.find((d) => d.id === recentId && d.img) ?? null;
    }
  } catch {}
  if (!recentDish) recentDish = todayDish;

  const picks: Record<string, DishLite> = { today: todayDish, random: randomDish, recent: recentDish };

  faces.forEach((face) => {
    const f = face.dataset.face;
    if (!f) return;
    const pick = picks[f];
    if (!pick) return;
    const imgEl = face.querySelector<HTMLElement>('.featured-img');
    if (imgEl && pick.img) imgEl.style.backgroundImage = `url("${pick.img}")`;
    const nameEl = face.querySelector<HTMLElement>('.featured-name');
    if (nameEl) nameEl.textContent = pick.name;
  });

  tile.addEventListener('click', () => {
    const active = tile.querySelector<HTMLElement>('.featured-face--active');
    const f = active?.dataset.face;
    if (!f) return;
    const pick = picks[f];
    if (pick) {
      try { localStorage.setItem('cantopedia-last-dish', pick.id); } catch {}
      tile.href = `${base}/${locale}/dishes/${pick.id}`;
    }
  });
  tile.href = `${base}/${locale}/dishes/${todayDish.id}`;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  const intervalId = window.setInterval(() => {
    faces[i].classList.remove('featured-face--active');
    i = (i + 1) % faces.length;
    faces[i].classList.add('featured-face--active');
    const f = faces[i].dataset.face;
    if (f && picks[f]) tile.href = `${base}/${locale}/dishes/${picks[f].id}`;
  }, 6000);
  // Stash interval ID on the element so a re-init can clear it
  (tile as any)._featuredInterval = intervalId;
}

export function teardownFeaturedTile() {
  const tile = document.getElementById('featured-tile') as HTMLElement | null;
  if (!tile) return;
  const id = (tile as any)._featuredInterval;
  if (typeof id === 'number') clearInterval(id);
  delete tile.dataset.wired;
}

export function initHubNav() {
  const hub = document.getElementById('hub') as HTMLElement | null;
  if (!hub || hub.dataset.navWired === '1') return;
  hub.dataset.navWired = '1';

  const titleEl = document.getElementById('hub-pivot-title');
  const prevLink = document.getElementById('hub-pivot-prev') as HTMLAnchorElement | null;
  const nextLink = document.getElementById('hub-pivot-next') as HTMLAnchorElement | null;
  const peekPrev = document.getElementById('hub-pivot-peek-prev');
  const peekNext = document.getElementById('hub-pivot-peek-next');
  const panels = Array.from(hub.querySelectorAll<HTMLElement>('.hub-panel'));
  if (panels.length === 0) return;

  // Use offsetLeft (not clientWidth * i) for scroll math — panels may not
  // be exactly clientWidth wide if main has padding.
  function offsetOf(i: number) {
    return panels[i].offsetLeft - panels[0].offsetLeft;
  }
  function getActiveIndex() {
    const sl = hub!.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const d = Math.abs(offsetOf(i) - sl);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function updatePivot(i: number) {
    const p = panels[i];
    if (!p) return;
    const name = p.dataset.name ?? '';
    const url = p.dataset.url ?? '';
    if (titleEl) titleEl.textContent = name;
    document.title = `${name} · 粵食典 Cantopedia`;
    if (url && location.pathname + location.hash !== url) {
      history.replaceState({ panelIndex: i }, '', url);
    }
    const prev = panels[(i - 1 + panels.length) % panels.length];
    const next = panels[(i + 1) % panels.length];
    if (prevLink && prev?.dataset.url) prevLink.href = prev.dataset.url;
    if (nextLink && next?.dataset.url) nextLink.href = next.dataset.url;
    // Peek labels — WP10 Mobile dim prev/next text
    if (peekPrev) peekPrev.textContent = prev?.dataset.name ?? '';
    if (peekNext) peekNext.textContent = next?.dataset.name ?? '';
  }

  function scrollToIndex(i: number) {
    hub!.scrollTo({ left: offsetOf(i), behavior: 'smooth' });
  }

  const initialPanelId = hub.dataset.initialPanel;
  const initialIdx = panels.findIndex((p) => p.dataset.panel === initialPanelId);
  if (initialIdx > 0) {
    hub.style.scrollBehavior = 'auto';
    hub.scrollLeft = offsetOf(initialIdx);
    requestAnimationFrame(() => { hub.style.scrollBehavior = 'smooth'; });
  }
  updatePivot(initialIdx >= 0 ? initialIdx : 0);

  prevLink?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToIndex((getActiveIndex() - 1 + panels.length) % panels.length);
  });
  nextLink?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToIndex((getActiveIndex() + 1) % panels.length);
  });

  hub.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevLink?.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextLink?.click(); }
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0.5) {
        const idx = panels.indexOf(entry.target as HTMLElement);
        if (idx >= 0) updatePivot(idx);
      }
    });
  }, { root: hub, threshold: [0.5] });
  panels.forEach((p) => io.observe(p));

  let resizeT: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      const i = getActiveIndex();
      hub.style.scrollBehavior = 'auto';
      hub.scrollLeft = offsetOf(i);
      requestAnimationFrame(() => { hub.style.scrollBehavior = 'smooth'; });
    }, 100);
  });
}

export function teardownHubNav() {
  const hub = document.getElementById('hub') as HTMLElement | null;
  if (!hub) return;
  delete hub.dataset.navWired;
}
```

- [ ] **Step 4: Update Hub.astro to call the extracted functions on every lifecycle event**

In `site/src/components/Hub.astro`, replace the two inline scripts (lines ~330-488 — the featured-tile `<script define:vars>` and the hub-nav `<script>`) with a single block:

```astro
<script define:vars={{ base, locale, dishesData }}>
  (window as any).__hubBoot = { base, locale, dishesData };
</script>

<script>
  import { initFeaturedTile, teardownFeaturedTile, initHubNav, teardownHubNav } from '~/lib/hubScripts';

  function boot() {
    const cfg = (window as any).__hubBoot;
    if (!cfg) return;
    initFeaturedTile(cfg.base, cfg.locale, cfg.dishesData);
    initHubNav();
  }
  function teardown() {
    teardownFeaturedTile();
    teardownHubNav();
  }

  boot();
  document.addEventListener('astro:after-swap', boot);
  document.addEventListener('astro:page-load', boot);
  document.addEventListener('astro:before-preparation', teardown);
</script>
```

- [ ] **Step 5: Run probe to confirm pass**

```bash
node site/scripts/probe-spa-nav.mjs
```

Expected: exits 0. Featured tile faces have background-images after ClientRouter nav. Hub scrolls to the correct panel offset.

- [ ] **Step 6: Commit**

```bash
git add site/src/lib/hubScripts.ts site/src/components/Hub.astro site/scripts/probe-spa-nav.mjs
git commit -m "fix: hub scripts re-init on astro:after-swap (SPA-nav restoration)"
```

---

### Task 3: Restore panel-clip fix (main:has(#hub) escape)

**Spec mapping:** step 2 — second of three baseline restorations.

**Why:** BaseLayout's `main { max-width: 1200px; padding: 1.5rem 1.5rem 6rem }` clips Hub panels by 48-128px on the right edge. Hub.astro's scoped `main { max-width:none !important }` doesn't reach `<main>` (Astro scope boundary). Fix: add an `is:global` rule.

**Files:**
- Modify: `site/src/components/Hub.astro` (add `<style is:global>` block)
- Create: `site/scripts/probe-panel-clip.mjs`

- [ ] **Step 1: Write the failing probe**

Write `site/scripts/probe-panel-clip.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const results = [];
for (const vp of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 375, height: 667 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto('http://localhost:4321/cantopedia/zh/', { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const main = document.querySelector('main') as HTMLElement | null;
    const hub = document.getElementById('hub');
    const firstPanel = document.querySelector('.hub-panel') as HTMLElement | null;
    return {
      mainWidth: main?.getBoundingClientRect().width,
      mainPaddingLeft: main ? getComputedStyle(main).paddingLeft : null,
      mainPaddingRight: main ? getComputedStyle(main).paddingRight : null,
      hubWidth: hub?.getBoundingClientRect().width,
      panelWidth: firstPanel?.getBoundingClientRect().width,
      viewport: window.innerWidth,
    };
  });
  results.push({ vp, data });
  await page.screenshot({ path: `site/probe-out/panel-clip-${vp.width}.png` });
  await page.close();
}
await browser.close();

writeFileSync('site/probe-out/panel-clip.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

// Assertion: panel width must equal viewport width (within 2px tolerance).
// If it's smaller by >= 48px, the main padding is clipping.
let ok = true;
for (const { vp, data } of results) {
  const delta = Math.abs((data.panelWidth ?? 0) - vp.width);
  if (delta > 2) {
    console.error(`FAIL ${vp.width}x${vp.height}: panel width ${data.panelWidth} ≠ viewport ${vp.width} (Δ=${delta})`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe — expect failure on current code**

```bash
node site/scripts/probe-panel-clip.mjs
```

Expected: at least 1280×800 fails — panel narrower than viewport by ~80-128px.

- [ ] **Step 3: Add is:global override in Hub.astro**

In `site/src/components/Hub.astro`, after the existing `<style>` block (or before it — anywhere in the component body), add:

```astro
<style is:global>
  main:has(#hub) {
    max-width: none;
    margin: 0;
    padding: 0;
  }
</style>
```

- [ ] **Step 4: Run probe — expect pass**

```bash
node site/scripts/probe-panel-clip.mjs
```

Expected: exits 0 for all three viewports. Inspect `site/probe-out/panel-clip-1280.png` — first panel fills the full viewport width with no right-edge gap.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Hub.astro site/scripts/probe-panel-clip.mjs
git commit -m "fix: hub panel clip via main:has(#hub) is:global escape"
```

---

### Task 4: Restore pivot peek text (WP10 dim prev/next labels)

**Spec mapping:** step 2 — third of three baseline restorations. The `initHubNav` function in T2 already writes to `#hub-pivot-peek-prev` / `#hub-pivot-peek-next`; this task adds the markup and CSS so they're visible.

**Files:**
- Modify: `site/src/components/Hub.astro` (add peek spans to pivot nav, add CSS)
- Create: `site/scripts/probe-pivot-peek.mjs`

- [ ] **Step 1: Add peek markup in Hub.astro pivot nav**

Find the `<nav class="hub-pivot">` block (lines ~114-119 in current Hub.astro). Replace it with:

```astro
<nav class="hub-pivot" aria-label="Hub pivot">
  <a class="hub-pivot-link hub-pivot-link--prev" id="hub-pivot-prev" href="#" data-dir="prev" aria-label="Previous panel">
    <span class="hub-pivot-peek hub-pivot-peek--prev" id="hub-pivot-peek-prev" aria-hidden="true"></span>
    <span class="hub-pivot-arrow">‹</span>
  </a>
  <h1 class="hub-pivot-title" id="hub-pivot-title">{initialTitle}</h1>
  <a class="hub-pivot-link hub-pivot-link--next" id="hub-pivot-next" href="#" data-dir="next" aria-label="Next panel">
    <span class="hub-pivot-arrow">›</span>
    <span class="hub-pivot-peek hub-pivot-peek--next" id="hub-pivot-peek-next" aria-hidden="true"></span>
  </a>
</nav>
```

- [ ] **Step 2: Add peek CSS in Hub.astro `<style>` block**

```css
.hub-pivot-link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--ink);
  text-decoration: none;
}
.hub-pivot-arrow {
  font-size: 1.6rem;
  font-weight: 200;
  line-height: 1;
}
.hub-pivot-peek {
  font-family: var(--sans), var(--sans-zh);
  font-weight: 300;
  font-size: 0.9rem;
  color: var(--ink-dim);
  opacity: 0.55;
  max-width: 8ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
@media (max-width: 540px) {
  .hub-pivot-peek { display: none; }
}
```

- [ ] **Step 3: Write the peek probe**

Write `site/scripts/probe-pivot-peek.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4321/cantopedia/zh/', { waitUntil: 'networkidle' });

const result = await page.evaluate(() => ({
  peekPrev: document.getElementById('hub-pivot-peek-prev')?.textContent,
  peekNext: document.getElementById('hub-pivot-peek-next')?.textContent,
  title: document.getElementById('hub-pivot-title')?.textContent,
}));

writeFileSync('site/probe-out/pivot-peek.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

await page.screenshot({ path: 'site/probe-out/pivot-peek.png' });
await browser.close();

// Assert: peek labels are non-empty
let ok = true;
if (!result.peekPrev || result.peekPrev.trim() === '') { console.error('FAIL: peekPrev empty'); ok = false; }
if (!result.peekNext || result.peekNext.trim() === '') { console.error('FAIL: peekNext empty'); ok = false; }
process.exit(ok ? 0 : 1);
```

- [ ] **Step 4: Run probe**

```bash
node site/scripts/probe-pivot-peek.mjs
```

Expected: peekPrev and peekNext are populated with category names. Screenshot shows dim text flanking the arrows.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/Hub.astro site/scripts/probe-pivot-peek.mjs
git commit -m "feat: hub pivot peek labels (WP10 Mobile dim prev/next text)"
```

---

## Phase 2 — Home Start Menu Metro tiles (spec step 3)

### Task 5: Create CatTile.astro template component

**Spec mapping:** part of step 3. Implements the cat-tile face system described in spec section "Live Tile face cycle".

**Files:**
- Create: `site/src/components/CatTile.astro`

- [ ] **Step 1: Write the component**

Write `site/src/components/CatTile.astro`:

```astro
---
/**
 * Reusable Metro live-tile with face cycling.
 *
 * Faces alternate: solid (icon + label + badge) → photo 1 → solid → photo 2 → …
 * Each face holds 2s. JS driver in lib/hubScripts.ts (initCatTileCycle).
 *
 * Props:
 *   size: 's' | 'm' | 'w' | 'l' — maps to tile-small/medium/wide/large
 *   href: navigation target
 *   color: solid-face background (CSS color string or var(--m-*) token)
 *   label: text shown on solid face (branding-bar)
 *   badge: optional count badge bottom-right
 *   photos: array of image URLs for photo faces (empty array → no cycling)
 *   viewTransitionName: optional inline view-transition-name for Continuum morph
 *   ariaLabel: accessible label
 */
export interface Props {
  size: 's' | 'm' | 'w' | 'l';
  href: string;
  color: string;
  label?: string;
  badge?: string | number;
  photos?: string[];
  viewTransitionName?: string;
  ariaLabel: string;
}
const { size, href, color, label, badge, photos = [], viewTransitionName, ariaLabel } = Astro.props;
const sizeClass = { s: 'tile-small', m: 'tile-medium', w: 'tile-wide', l: 'tile-large' }[size];
const hasImgs = photos.length > 0;
const vtStyle = viewTransitionName ? `view-transition-name: ${viewTransitionName};` : '';
---
<a
  class={`${sizeClass} cat-tile ${hasImgs ? 'has-imgs' : ''} wp-tile`}
  href={href}
  aria-label={ariaLabel}
  style={vtStyle}
>
  <div class="cat-face cat-face--solid active" style={`background: ${color};`}>
    <span class="cat-tile-content"><slot /></span>
    {label && <span class="branding-bar">{label}</span>}
    {badge != null && <span class="badge-bottom">{badge}</span>}
  </div>
  {photos.map((src) => (
    <div class="cat-face cat-face--photo" style={`background-image: url('${src}');`}>
      {label && <span class="branding-bar">{label}</span>}
    </div>
  ))}
</a>

<style is:global>
  /* Sharp corners override — Metro is mostly square but defense-in-depth */
  [class*="tile-"].cat-tile { border-radius: 0 !important; }
  .cat-tile {
    position: relative;
    overflow: hidden;
    perspective: 800px;
    color: #fff;
    text-decoration: none;
    display: block;
  }
  .cat-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    transform: rotateX(90deg);
    opacity: 0;
    transition: transform 520ms cubic-bezier(0.6, 0, 0.2, 1), opacity 220ms ease;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    padding: 8px;
    background-size: cover;
    background-position: center;
  }
  .cat-face.active {
    transform: rotateX(0deg);
    opacity: 1;
  }
  .cat-face--photo::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%);
    pointer-events: none;
  }
  .cat-tile-content {
    position: absolute;
    top: 8px; left: 8px;
    color: #fff;
  }
  .branding-bar {
    font-family: var(--sans), var(--sans-zh);
    font-size: 0.8rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    line-height: 1.2;
    word-break: keep-all;
    overflow-wrap: anywhere;
    max-width: 100%;
    position: relative;
    z-index: 2;
  }
  .badge-bottom {
    position: absolute;
    bottom: 6px; right: 8px;
    font-family: var(--sans);
    font-size: 0.7rem;
    background: rgba(0,0,0,0.4);
    padding: 1px 6px;
    z-index: 2;
  }
  @media (prefers-reduced-motion: reduce) {
    .cat-face { transition: none; }
  }
</style>
```

- [ ] **Step 2: Commit (no probe yet — exercised in T6)**

```bash
git add site/src/components/CatTile.astro
git commit -m "feat: add CatTile.astro template component (Metro tile + face cycle)"
```

---

### Task 6: Add cat-tile face cycle JS driver

**Spec mapping:** part of step 3.

**Files:**
- Modify: `site/src/lib/hubScripts.ts` (add `initCatTileCycle` + `teardownCatTileCycle`)
- Modify: `site/src/components/Hub.astro` (call new functions from boot/teardown)
- Create: `site/scripts/probe-cat-tile.mjs`

- [ ] **Step 1: Add the driver to hubScripts.ts**

Append to `site/src/lib/hubScripts.ts`:

```ts
const _catTileTimers = new WeakMap<HTMLElement, number>();

export function initCatTileCycle() {
  const tiles = document.querySelectorAll<HTMLElement>('.cat-tile.has-imgs');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  tiles.forEach((tile, idx) => {
    if (tile.dataset.cycleWired === '1') return;
    tile.dataset.cycleWired = '1';

    const faces = Array.from(tile.querySelectorAll<HTMLElement>('.cat-face'));
    if (faces.length < 2) return;
    const solidFace = tile.querySelector<HTMLElement>('.cat-face--solid');
    const photoFaces = faces.filter((f) => f.classList.contains('cat-face--photo'));
    if (!solidFace || photoFaces.length === 0) return;

    let showSolid = true;   // current face is solid
    let photoIdx = 0;
    let currentActive: HTMLElement = solidFace;

    function tick() {
      currentActive.classList.remove('active');
      if (showSolid) {
        // about to switch to photo
        currentActive = photoFaces[photoIdx];
        photoIdx = (photoIdx + 1) % photoFaces.length;
      } else {
        currentActive = solidFace!;
      }
      currentActive.classList.add('active');
      showSolid = !showSolid;
    }

    // Stagger starts so tiles don't flip in sync
    const startDelay = idx * 350;
    const startId = window.setTimeout(() => {
      tick();
      const intervalId = window.setInterval(tick, 2000);
      _catTileTimers.set(tile, intervalId);
    }, startDelay);
    // Stash the timeout ID too so teardown can cancel before first tick
    (tile as any)._catTileStartTimeout = startId;
  });
}

export function teardownCatTileCycle() {
  document.querySelectorAll<HTMLElement>('.cat-tile').forEach((tile) => {
    const startId = (tile as any)._catTileStartTimeout;
    if (typeof startId === 'number') clearTimeout(startId);
    const intervalId = _catTileTimers.get(tile);
    if (typeof intervalId === 'number') clearInterval(intervalId);
    _catTileTimers.delete(tile);
    delete tile.dataset.cycleWired;
  });
}
```

- [ ] **Step 2: Wire boot/teardown in Hub.astro**

Update the `boot()` and `teardown()` functions in Hub.astro's script block (from T2):

```ts
import { initFeaturedTile, teardownFeaturedTile, initHubNav, teardownHubNav,
         initCatTileCycle, teardownCatTileCycle } from '~/lib/hubScripts';

function boot() {
  const cfg = (window as any).__hubBoot;
  if (!cfg) return;
  initFeaturedTile(cfg.base, cfg.locale, cfg.dishesData);
  initHubNav();
  initCatTileCycle();
}
function teardown() {
  teardownFeaturedTile();
  teardownHubNav();
  teardownCatTileCycle();
}
```

- [ ] **Step 3: Write the cat-tile probe**

Write `site/scripts/probe-cat-tile.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Force motion (override reduced-motion preference)
await page.emulateMedia({ reducedMotion: 'no-preference' });

await page.goto('http://localhost:4321/cantopedia/zh/', { waitUntil: 'networkidle' });

// T7 hasn't shipped yet, so this probe currently only verifies driver presence.
// After T7 it asserts that a cat-tile.has-imgs cycles its active face within 5s.

async function activeFaceClass(sel) {
  return await page.evaluate((s) => {
    const tile = document.querySelector(s);
    if (!tile) return null;
    const active = tile.querySelector('.cat-face.active');
    if (!active) return null;
    return active.classList.contains('cat-face--solid') ? 'solid' : 'photo';
  }, sel);
}

const before = await activeFaceClass('.cat-tile.has-imgs');
await page.waitForTimeout(3000);
const after = await activeFaceClass('.cat-tile.has-imgs');

await page.screenshot({ path: 'site/probe-out/cat-tile.png' });
writeFileSync('site/probe-out/cat-tile.json', JSON.stringify({ before, after }, null, 2));
console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();

let ok = true;
if (before === null) {
  console.warn('SKIP: no .cat-tile.has-imgs present yet — pass conditionally');
} else if (before === after) {
  console.error(`FAIL: cat-tile did not cycle in 3s (before=${before}, after=${after})`);
  ok = false;
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 4: Smoke-run the probe (currently SKIPs since T7 hasn't shipped any cat-tiles)**

```bash
node site/scripts/probe-cat-tile.mjs
```

Expected: prints `before: null` and the SKIP warning. Test is wired but waiting on T7.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/hubScripts.ts site/src/components/Hub.astro site/scripts/probe-cat-tile.mjs
git commit -m "feat: cat-tile face cycle JS driver with lifecycle hooks"
```

---

### Task 7: Convert home panel markup to Metro tiles

**Spec mapping:** part of step 3. The big one — replace `.start-screen` grid + `.tile` + `.face` markup with `.tiles-grid` + `<CatTile>` instances. Stat tiles and featured tile also become Metro tiles.

**Files:**
- Modify: `site/src/components/Hub.astro` (heavy)

- [ ] **Step 1: Import Metro CSS + new components in Hub.astro frontmatter**

At the top of the `---` block in `site/src/components/Hub.astro`, after the existing imports:

```ts
import '@olton/metroui/lib/metro.css';
import '@olton/metroui/lib/icons.css';
import CatTile from '~/components/CatTile.astro';
```

- [ ] **Step 2: Build a per-category random photo selector**

In Hub.astro frontmatter (after `dishesByCat` is built), add:

```ts
function categoryPhotos(catId: string, max = 4): string[] {
  const dishes = dishesByCat.get(catId) ?? [];
  return dishes
    .map((d) => d.data.images?.[0]?.path)
    .filter((p): p is string => !!p)
    .slice(0, max)
    .map((p) => commonsThumb(p, 800));
}
```

- [ ] **Step 3: Replace the home panel body**

Find the `<section class="hub-panel hub-panel--home">` block (starts ~line 123 in current Hub.astro). Replace its **inner content** (between `<section ...>` and `</section>`) — that is, drop the `.panorama`, `.featured-section`, `.pivot-section` (stat tiles), `.pivot-h`, and `.start-screen` blocks. Replace with:

```astro
    <div class="tiles-grid start-tiles">
      {/* Featured wide live tile — uses tile-wide for sizing + its own .featured-face show/hide cycle.
          Do NOT add cat-face classes here — featured tile has its own display:none/block toggle
          driven by initFeaturedTile() and would conflict with cat-face's rotateX/opacity rules. */}
      <a id="featured-tile" class="tile-wide featured-tile wp-tile" href={`${base}/${locale}/dishes/${firstDishId}`}>
        <div class="featured-face featured-face--active" data-face="today">
          <div class="featured-img"></div>
          <div class="featured-overlay"></div>
          <span class="branding-bar featured-label">{dict.featured_today}</span>
          <span class="featured-name"></span>
        </div>
        <div class="featured-face" data-face="random">
          <div class="featured-img"></div>
          <div class="featured-overlay"></div>
          <span class="branding-bar featured-label">{dict.featured_random}</span>
          <span class="featured-name"></span>
        </div>
        <div class="featured-face" data-face="recent">
          <div class="featured-img"></div>
          <div class="featured-overlay"></div>
          <span class="branding-bar featured-label">{dict.featured_recent}</span>
          <span class="featured-name"></span>
        </div>
      </a>

      {/* 8 category tiles with face cycling */}
      {allCats.map((cat) => {
        const inCat = dishesByCat.get(cat.id) ?? [];
        if (inCat.length === 0) return null;
        const catName = nameOf(cat);
        const size: 's'|'m'|'w' = inCat.length >= 20 ? 'w' : inCat.length >= 7 ? 'm' : 's';
        const photos = categoryPhotos(cat.id);
        return (
          <CatTile
            size={size}
            href={`${base}/${locale}/browse/${cat.id}`}
            color={tileColorFor(cat.id)}
            label={catName}
            badge={inCat.length}
            photos={photos}
            viewTransitionName={`tile-${cat.id}`}
            ariaLabel={`${catName} (${inCat.length} ${dict.pieces})`}
          />
        );
      })}

      {/* 4 stat tiles (medium, no photos, inline-style backgrounds via --m-* tokens) */}
      <a class="tile-medium cat-tile wp-tile stat-tile-mt" href={`${base}/${locale}/all`} style="background: var(--m-green); view-transition-name: stat-complete;">
        <div class="cat-face cat-face--solid active" style="background: var(--m-green);">
          <span class="stat-num">{complete}</span>
          <span class="branding-bar">{dict.complete}</span>
        </div>
      </a>
      <a class="tile-medium cat-tile wp-tile stat-tile-mt" href={`${base}/${locale}/all`} style="background: var(--m-orange);">
        <div class="cat-face cat-face--solid active" style="background: var(--m-orange);">
          <span class="stat-num">{draft}</span>
          <span class="branding-bar">{dict.draft}</span>
        </div>
      </a>
      <a class="tile-medium cat-tile wp-tile stat-tile-mt" href={`${base}/${locale}/all`} style="background: var(--m-steel);">
        <div class="cat-face cat-face--solid active" style="background: var(--m-steel);">
          <span class="stat-num">{total - complete - draft}</span>
          <span class="branding-bar">{dict.stub}</span>
        </div>
      </a>
      <a class="tile-medium cat-tile wp-tile stat-tile-mt" href={`${base}/${locale}/all`} style="background: var(--m-red);">
        <div class="cat-face cat-face--solid active" style="background: var(--m-red);">
          <span class="stat-num">{total}</span>
          <span class="branding-bar">{dict.pieces}</span>
        </div>
      </a>
    </div>
```

- [ ] **Step 4: Add layout CSS for `.tiles-grid` + `.stat-num`**

Append to Hub.astro's `<style>` block:

```css
.tiles-grid.start-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 1rem;
  align-content: flex-start;
}
.stat-num {
  font-family: var(--sans);
  font-size: 3rem;
  font-weight: 200;
  color: #fff;
  line-height: 1;
  position: absolute;
  top: 12px; left: 12px;
}
.featured-tile {
  position: relative;
  overflow: hidden;
  color: #fff;
  text-decoration: none;
  display: block;
}
.featured-tile .featured-face {
  position: absolute;
  inset: 0;
  display: none;
}
.featured-tile .featured-face--active {
  display: block;
}
.featured-tile .featured-img {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
}
.featured-tile .featured-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0));
}
.featured-tile .featured-name {
  position: absolute;
  bottom: 32px; left: 12px;
  font-family: var(--sans), var(--sans-zh);
  font-size: 1.1rem;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  z-index: 2;
}
.featured-tile .featured-label {
  position: absolute;
  bottom: 12px; left: 12px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  opacity: 0.85;
  z-index: 2;
}
@media (max-width: 540px) {
  /* Responsive scale via direct width/height override (NOT transform: scale).
     Numbers: small 56, medium 120, wide 248, large 248. */
  .tiles-grid .tile-small  { width: 56px;  height: 56px;  }
  .tiles-grid .tile-medium { width: 120px; height: 120px; }
  .tiles-grid .tile-wide   { width: 248px; height: 120px; }
  .tiles-grid .tile-large  { width: 248px; height: 248px; }
}
```

- [ ] **Step 5: Run the cat-tile probe to verify cycling**

```bash
node site/scripts/probe-cat-tile.mjs
```

Expected: now passes (no SKIP). `before` and `after` differ (solid → photo cycle observed).

- [ ] **Step 6: Run the SPA-nav probe again (regression check)**

```bash
node site/scripts/probe-spa-nav.mjs
```

Expected: still passes — featured tile still wires up after ClientRouter nav.

- [ ] **Step 7: Run panel-clip probe (regression check)**

```bash
node site/scripts/probe-panel-clip.mjs
```

Expected: still passes.

- [ ] **Step 8: Visual smoke — capture screenshots across 3 viewports + 3 locales**

```bash
node -e "
import('playwright').then(async ({ chromium }) => {
  const b = await chromium.launch();
  for (const loc of ['zh','yue','en']) {
    for (const vp of [{width:1280,height:800},{width:768,height:1024},{width:375,height:667}]) {
      const p = await b.newPage({ viewport: vp });
      await p.goto('http://localhost:4321/cantopedia/' + loc + '/', { waitUntil: 'networkidle' });
      await p.screenshot({ path: 'site/probe-out/home-' + loc + '-' + vp.width + '.png', fullPage: true });
      await p.close();
    }
  }
  await b.close();
});
"
```

Open each PNG in `site/probe-out/` — visually verify:
- 1 wide featured tile + 8 category tiles + 4 stat tiles laid out without gaps
- Photo faces are visible on cycling category tiles
- All 3 locales render labels correctly (CJK doesn't break)
- 375px viewport scales tiles down via the media query (no horizontal overflow)

- [ ] **Step 9: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "feat: home Start Menu with Metro tiles + 2s face cycle (CatTile)"
```

---

### Task 8: CSS-leak audit on Hub-loading pages + counter-overrides

**Spec mapping:** mandatory part of step 3 + gotcha #6.

**Why:** Metro CSS imports are global on Hub-loading pages. Metro's `body{}`, `*{}`, `a{}`, button rules will restyle BaseLayout's `.metro-nav`, `<footer>`, `.brand`, locale switcher, etc. We screenshot-diff Hub-page chrome vs. dish-page chrome and add counter-overrides for any regression.

**Files:**
- Create: `site/scripts/probe-css-leak.mjs`
- Modify: `site/src/layouts/BaseLayout.astro` (add counter-overrides at bottom of `<style is:global>`)

- [ ] **Step 1: Write the CSS-leak diff probe**

Write `site/scripts/probe-css-leak.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const SELECTORS = [
  '.metro-nav',
  '.metro-nav .brand-name',
  '.metro-nav .pivot-tab',
  '.metro-nav .pivot-tab.active',
  'footer',
  'footer::before',
  'main',
  '.loading-bar',
];

async function capture(url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  return await page.evaluate((selectors) => {
    const out = {};
    for (const sel of selectors) {
      const cleanSel = sel.replace(/::.*$/, '');
      const el = document.querySelector(cleanSel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      out[sel] = {
        display: cs.display,
        position: cs.position,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontFamily: cs.fontFamily.slice(0, 40),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        height: cs.height,
        padding: cs.padding,
        margin: cs.margin,
      };
    }
    return out;
  }, SELECTORS);
}

const hub = await capture('http://localhost:4321/cantopedia/zh/');
const dish = await capture('http://localhost:4321/cantopedia/zh/dishes/dish-01');

// Diff: for each selector, list properties that differ
const diff = {};
for (const sel of SELECTORS) {
  const h = hub[sel] ?? {};
  const d = dish[sel] ?? {};
  const keys = new Set([...Object.keys(h), ...Object.keys(d)]);
  const props = {};
  for (const k of keys) {
    if (h[k] !== d[k]) props[k] = { hub: h[k], dish: d[k] };
  }
  if (Object.keys(props).length > 0) diff[sel] = props;
}

writeFileSync('site/probe-out/css-leak.json', JSON.stringify(diff, null, 2));
console.log(JSON.stringify(diff, null, 2));

await browser.close();

// Decision: print diff; manual review decides what's a regression vs. acceptable.
// Probe always exits 0 — humans flag regressions.
process.exit(0);
```

- [ ] **Step 2: Run probe and review the diff**

```bash
node site/scripts/probe-css-leak.mjs
cat site/probe-out/css-leak.json
```

For each diff entry, decide:
- **Regression**: chrome element looks wrong on Hub pages. Add counter-override.
- **Acceptable**: difference is harmless (e.g., font fallback fine).

- [ ] **Step 3: Add counter-overrides for any regressions**

In `site/src/layouts/BaseLayout.astro`'s `<style is:global>` block, at the END (so it wins specificity), add a clearly-labeled section. Common counter-overrides Metro CSS may force:

```css
/* === Metro CSS counter-overrides (T8 of WP10 plan) ===
   Metro UI's global rules (body{}, button{}, a{}) restyle BaseLayout chrome
   on Hub-loading pages. These rules force our chrome back. */
body:has(#hub) .metro-nav,
body:has(.tiles-grid) .metro-nav {
  display: flex !important;
  height: 40px !important;
  padding: 0 0.75rem !important;
  background: #000 var(--acrylic-noise) !important;
  background-blend-mode: overlay !important;
}
body:has(#hub) footer,
body:has(.tiles-grid) footer {
  display: block !important;
  background: #000 !important;
  color: rgba(255,255,255,0.7) !important;
}
body:has(#hub) .pivot-tab,
body:has(.tiles-grid) .pivot-tab {
  padding: 0.55rem 0.6rem !important;
  font-size: 0.7rem !important;
}
/* Add more here as the css-leak probe reveals them */
```

(Only include the rules for selectors that the probe diff flagged as broken.)

- [ ] **Step 4: Re-run probe + visual smoke**

```bash
node site/scripts/probe-css-leak.mjs
node site/scripts/probe-spa-nav.mjs
node site/scripts/probe-panel-clip.mjs
```

Open `site/probe-out/home-zh-1280.png` (from T7 step 8) again — nav and footer should look identical to a dish page nav/footer.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/probe-css-leak.mjs site/src/layouts/BaseLayout.astro
git commit -m "fix: counter-overrides for Metro CSS global leaks on chrome"
```

---

## Phase 3 — Theme + utility tiles, then drawer removal (spec steps 4-5)

### Task 9: Add utility row tiles (search/theme/github) to Start Menu

**Spec mapping:** step 4. **Drawer is still in place during this task** — both controls coexist as a safety net.

**Files:**
- Modify: `site/src/components/Hub.astro` (extend `.tiles-grid.start-tiles` with utility row)
- Create: `site/scripts/probe-theme-tiles.mjs`

- [ ] **Step 1: Append utility row markup to start-tiles**

In `site/src/components/Hub.astro`, after the 4 stat tiles in `.tiles-grid.start-tiles` (from T7), append:

```astro
      {/* Utility row: search + 3 theme + github (all small) */}
      <a class="tile-small cat-tile wp-tile util-tile" href={`${base}/${locale}/search`} style="background: var(--m-cyan);" aria-label={dict.tag_search ?? 'Search'}>
        <div class="cat-face cat-face--solid active" style="background: var(--m-cyan);">
          <span class="mif-search" style="font-size: 32px; color: #fff;"></span>
        </div>
      </a>
      <button type="button" class="tile-small cat-tile wp-tile util-tile" data-theme-choice="light" style="background: var(--m-yellow);" aria-label={dict.light ?? 'Light'}>
        <div class="cat-face cat-face--solid active" style="background: var(--m-yellow);">
          <span class="mif-sunny" style="font-size: 32px; color: #fff;"></span>
        </div>
      </button>
      <button type="button" class="tile-small cat-tile wp-tile util-tile" data-theme-choice="dark" style="background: var(--m-purple);" aria-label={dict.dark ?? 'Dark'}>
        <div class="cat-face cat-face--solid active" style="background: var(--m-purple);">
          <span class="mif-moon-right" style="font-size: 32px; color: #fff;"></span>
        </div>
      </button>
      <button type="button" class="tile-small cat-tile wp-tile util-tile" data-theme-choice="auto" style="background: var(--m-steel);" aria-label={dict.auto ?? 'Auto'}>
        <div class="cat-face cat-face--solid active" style="background: var(--m-steel);">
          <span class="mif-cog" style="font-size: 32px; color: #fff;"></span>
        </div>
      </button>
      <a class="tile-small cat-tile wp-tile util-tile" href="https://github.com/ShepherdLoveYou/cantopedia" target="_blank" rel="noopener" style="background: var(--m-ink);" aria-label="GitHub">
        <div class="cat-face cat-face--solid active" style="background: var(--m-ink);">
          <span class="mif-github" style="font-size: 32px; color: #fff;"></span>
        </div>
      </a>
```

(Theme tile click handlers are already delegated by BaseLayout.astro's `document.addEventListener('click', ...)` block at `BaseLayout.astro:376-380` — the `[data-theme-choice]` selector picks up these new buttons automatically.)

- [ ] **Step 2: Verify the mif-* icon names exist**

```bash
grep -oE 'mif-(search|sunny|moon-right|cog|github)' site/node_modules/@olton/metroui/lib/icons.css | sort -u
```

Expected: all 5 names appear. If any is missing, substitute from the icons.css inventory (`grep -oE 'mif-[a-z-]+' site/node_modules/@olton/metroui/lib/icons.css | sort -u | head -50`).

- [ ] **Step 3: Write the theme probe**

Write `site/scripts/probe-theme-tiles.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4321/cantopedia/zh/', { waitUntil: 'networkidle' });

async function readTheme() {
  return await page.evaluate(() => ({
    dataTheme: document.documentElement.dataset.theme,
    dataChoice: document.documentElement.dataset.themeChoice,
    localStorage: localStorage.getItem('cantopedia-theme'),
  }));
}

const initial = await readTheme();

// Click the dark theme tile
await page.click('button[data-theme-choice="dark"].util-tile');
await page.waitForTimeout(200);
const afterDark = await readTheme();

// Click the light theme tile
await page.click('button[data-theme-choice="light"].util-tile');
await page.waitForTimeout(200);
const afterLight = await readTheme();

// Verify theme persists across nav
await page.click('a[href*="/dishes/"]');
await page.waitForLoadState('networkidle');
const afterNav = await readTheme();

writeFileSync('site/probe-out/theme-tiles.json', JSON.stringify({ initial, afterDark, afterLight, afterNav }, null, 2));
console.log(JSON.stringify({ initial, afterDark, afterLight, afterNav }, null, 2));

await browser.close();

let ok = true;
if (afterDark.dataTheme !== 'dark') { console.error('FAIL: clicking dark tile did not set data-theme=dark'); ok = false; }
if (afterLight.dataTheme !== 'light') { console.error('FAIL: clicking light tile did not set data-theme=light'); ok = false; }
if (afterNav.dataTheme !== 'light') { console.error('FAIL: theme did not persist across nav'); ok = false; }
if (afterLight.localStorage !== 'light') { console.error('FAIL: localStorage not updated'); ok = false; }
process.exit(ok ? 0 : 1);
```

- [ ] **Step 4: Run probe**

```bash
node site/scripts/probe-theme-tiles.mjs
```

Expected: exits 0 — theme tiles toggle theme, persist across nav.

- [ ] **Step 5: Manual verification — drawer theme buttons still work**

Open `http://localhost:4321/cantopedia/zh/` in browser, click hamburger, click drawer theme buttons. Both should still work.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/Hub.astro site/scripts/probe-theme-tiles.mjs
git commit -m "feat: utility + theme tiles on Start Menu (drawer still wired)"
```

---

### Task 10: Drop drawer + hamburger + focus-trap

**Spec mapping:** step 5.

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (heavy — remove markup, CSS, JS, dict keys)
- Modify: `site/package.json` (remove focus-trap)

- [ ] **Step 1: Remove drawer markup from BaseLayout.astro**

Delete:
- The `<button class="hamburger">` block ([BaseLayout.astro:101-105](site/src/layouts/BaseLayout.astro#L101-L105))
- The entire `{showNav && (<><div class="drawer-scrim">...<aside class="nav-drawer">...</aside></>)}` fragment ([BaseLayout.astro:116-170](site/src/layouts/BaseLayout.astro#L116-L170))

Keep the `<nav class="metro-nav">` but remove the hamburger button from inside it.

- [ ] **Step 2: Remove drawer-related CSS from BaseLayout.astro**

In the `<style is:global>` block, delete:
- All `.hamburger`, `.hamburger-bar` rules
- All `.drawer-scrim`, `.nav-drawer`, `.drawer-inner`, `.drawer-brand`, `.drawer-section-label`, `.drawer-search-link`, `.drawer-search-icon`, `.drawer-cats`, `.drawer-cat`, `.drawer-cat-icon`, `.drawer-cat-name`, `.drawer-cat-count`, `.drawer-rule`, `.drawer-locales`, `.drawer-locale`, `.drawer-themes`, `.drawer-theme`, `.drawer-foot` rules
- The `.nav-drawer, .drawer-scrim, .hamburger-bar { transition: none !important }` rule inside `@media (prefers-reduced-motion: reduce)`

(Keep the `[data-theme-choice]` click handler in the script block — that's still needed for the new utility theme tiles.)

- [ ] **Step 3: Remove drawer JS from BaseLayout.astro**

Delete the second `<script>` block ([BaseLayout.astro:264-398](site/src/layouts/BaseLayout.astro#L264-L398)) — the one importing `focus-trap`. Replace with a minimal script that keeps just the theme toggle delegation + initMotion:

```astro
<script>
  import { initMotion } from '~/lib/motion';

  function reapplyTheme() {
    try {
      const choice = localStorage.getItem('cantopedia-theme') || 'auto';
      const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.themeChoice = choice;
      document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.themeChoice === choice ? 'true' : 'false');
      });
    } catch {}
  }

  function applyChoice(choice: string) {
    const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themeChoice = choice;
    try { localStorage.setItem('cantopedia-theme', choice); } catch {}
    document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.themeChoice === choice ? 'true' : 'false');
    });
  }

  function setup() {
    reapplyTheme();
    initMotion();
  }

  // Theme tile click delegation
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-theme-choice]');
    if (!btn) return;
    applyChoice(btn.dataset.themeChoice!);
  });

  setup();
  document.addEventListener('astro:page-load', setup);
</script>
```

- [ ] **Step 4: Remove unused dict keys + drawerCategories derivation**

In `site/src/layouts/BaseLayout.astro` frontmatter, remove:
- The `categoryCounts` Map computation ([BaseLayout.astro:41-45](site/src/layouts/BaseLayout.astro#L41-L45))
- The `drawerCategories` array ([BaseLayout.astro:46-48](site/src/layouts/BaseLayout.astro#L46-L48))
- The `getCollection('category')` and `getCollection('dish')` imports if no longer used elsewhere in this file
- The `CategoryIcon` import if no longer used
- From the `dict` object: `tag_browse`, `tag_search`, `tag_about`, `menu`, `theme`, `light`, `dark`, `auto`, `pieces`, `github` (keep `yue`, `zh`, `en` for the locale switcher)

- [ ] **Step 5: Remove focus-trap dependency**

```bash
cd site && pnpm remove focus-trap
```

Expected: `package.json` no longer lists focus-trap; `pnpm-lock.yaml` updates.

- [ ] **Step 6: Regression-run all probes**

```bash
node site/scripts/probe-spa-nav.mjs
node site/scripts/probe-panel-clip.mjs
node site/scripts/probe-pivot-peek.mjs
node site/scripts/probe-cat-tile.mjs
node site/scripts/probe-css-leak.mjs
node site/scripts/probe-theme-tiles.mjs
```

All should exit 0. **If css-leak diff changed**, update BaseLayout counter-overrides accordingly.

- [ ] **Step 7: Manual verification: navigate to non-Hub pages, confirm theme works**

Visit each: `/zh/dishes/<some-id>`, `/zh/ingredients/<some-id>`, `/zh/search`, `/404`. Use the home Start Menu theme tiles, then navigate to a non-Hub page — theme should follow.

- [ ] **Step 8: Commit**

```bash
git add site/src/layouts/BaseLayout.astro site/package.json site/pnpm-lock.yaml
git commit -m "refactor: remove drawer + hamburger + focus-trap (theme on Start Menu)"
```

---

## Phase 4 — Browse panels (spec step 6)

### Task 11: Convert browse panels (dish-grid → tiles-grid + dish tiles)

**Spec mapping:** step 6. Per the revised spec: **all medium, static** dish tiles (no face cycling on dish tiles for first pass; cycling reserved for Start Menu category tiles).

**Files:**
- Modify: `site/src/components/Hub.astro` (replace the 8 category-panel rendering blocks)

- [ ] **Step 1: Replace browse panel markup**

In `site/src/components/Hub.astro`, find the `<!-- Panels 1-8: CATEGORIES -->` block (lines ~268-326 in current code). Replace it with:

```astro
  <!-- Panels 2-9: CATEGORIES (after AppList panel in T12; for now 1-8) -->
  {allCats.map((cat) => {
    const dishes = dishesByCat.get(cat.id) ?? [];
    const tileColor = tileColorFor(cat.id);
    const catName = nameOf(cat);
    return (
      <section
        class="hub-panel"
        data-panel={cat.id}
        data-cat={cat.id}
        data-name={catName}
        data-url={`${base}/${locale}/browse/${cat.id}`}
        aria-labelledby={`hub-title-${cat.id}`}
      >
        <div class="tiles-grid browse-tiles">
          {dishes.map((dish) => {
            const dishName = locale === 'en' ? dish.data.names.en : dish.data.names.yue_hant;
            const heroImg = dish.data.images?.[0];
            const thumb = heroImg ? commonsThumb(heroImg.path, 800) : null;
            return (
              <a
                class="tile-medium cat-tile wp-tile dish-tile"
                href={`${base}/${locale}/dishes/${dish.id}`}
                style={`background: ${tileColor}; ${thumb ? `background-image: url('${thumb}'); background-size: cover; background-position: center;` : ''} view-transition-name: dish-${dish.id};`}
                aria-label={dishName}
              >
                <div class="cat-face cat-face--solid active" style={thumb ? '' : `background: ${tileColor};`}>
                  <span class="dish-no">#{String(dish.data.menu_no).padStart(2, '0')}</span>
                  <span class="branding-bar">{dishName}</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    );
  })}
```

- [ ] **Step 2: Add dish-tile-specific CSS**

Append to Hub.astro `<style>` block:

```css
.tiles-grid.browse-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 1rem;
  align-content: flex-start;
}
.dish-tile {
  position: relative;
  overflow: hidden;
}
.dish-tile .cat-face--solid {
  background: rgba(0,0,0,0.25);   /* photo overlay if image set */
}
.dish-no {
  position: absolute;
  top: 8px; right: 8px;
  font-family: var(--sans);
  font-size: 0.85rem;
  font-weight: 200;
  color: #fff;
  background: rgba(0,0,0,0.4);
  padding: 2px 6px;
  z-index: 2;
}
.dish-tile .branding-bar {
  position: absolute;
  bottom: 8px; left: 8px; right: 8px;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
```

- [ ] **Step 3: Write a verification probe**

Reuse the visual smoke from T7 step 8 but for browse pages. Run:

```bash
node -e "
import('playwright').then(async ({ chromium }) => {
  const b = await chromium.launch();
  const cats = ['appetizer','soup-wonton','rice','noodle','soup-noodle','baked-rice','congee','main'];
  for (const cat of cats) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('http://localhost:4321/cantopedia/zh/browse/' + cat, { waitUntil: 'networkidle' });
    await p.screenshot({ path: 'site/probe-out/browse-' + cat + '.png', fullPage: true });
    await p.close();
  }
  await b.close();
});
"
```

Inspect each PNG. Expected: tiles grid with dish photos as backgrounds, dish names readable in white with shadow, menu number badge top-right.

- [ ] **Step 4: Test the view-transition morph from home tile → browse panel → dish**

Manually in browser: visit `/zh/`, click the "noodle" category tile, then click a dish tile. The Continuum tile-to-page morph (via `view-transition-name`) should run on both clicks.

- [ ] **Step 5: Regression-run probes**

```bash
node site/scripts/probe-spa-nav.mjs
node site/scripts/probe-panel-clip.mjs
node site/scripts/probe-cat-tile.mjs
```

- [ ] **Step 6: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "feat: browse panels with Metro dish tiles (uniform medium, static)"
```

---

## Phase 5 — AppList panel + /[locale]/all route (spec step 7)

### Task 12: Add AppList panel component + /[locale]/all route

**Spec mapping:** step 7 first half. The AppList becomes panel index 1 (between Start and the 8 categories — so total 10 panels).

**Files:**
- Create: `site/src/components/AppListPanel.astro`
- Create: `site/src/pages/[locale]/all.astro`
- Modify: `site/src/components/Hub.astro` (insert AppListPanel between home panel and category panels; bump panel comments to "Panels 2-9: CATEGORIES")
- Modify: `site/src/components/Hub.astro` frontmatter (handle `initialPanel === 'all'`)

- [ ] **Step 1: Write AppListPanel.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { commonsThumb } from '~/lib/commonsImage';

interface Props {
  locale: 'zh' | 'yue' | 'en';
  dishes: CollectionEntry<'dish'>[];
  base: string;
  dataUrl: string;
  panelName: string;
}
const { locale, dishes, base, dataUrl, panelName } = Astro.props;

function sortKey(d: CollectionEntry<'dish'>): string {
  if (locale === 'en') return (d.data.names.en ?? '').toLowerCase();
  // For zh + yue: sort by jyutping (already a Latin-script romanization)
  return (d.data.names.jyutping ?? '').toLowerCase();
}
function firstLetter(d: CollectionEntry<'dish'>): string {
  const k = sortKey(d);
  return k.charAt(0).toUpperCase() || '#';
}

const sorted = [...dishes].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

// Group by first letter
const byLetter = new Map<string, typeof sorted>();
for (const d of sorted) {
  const L = firstLetter(d);
  const arr = byLetter.get(L) ?? [];
  arr.push(d);
  byLetter.set(L, arr);
}
const letters = Array.from(byLetter.keys()).sort();
---
<section
  class="hub-panel hub-panel--applist"
  data-panel="all"
  data-name={panelName}
  data-url={dataUrl}
  aria-label={panelName}
>
  <div class="app-list">
    {letters.map((L) => (
      <div class="app-list-section" data-letter={L}>
        <h3 class="app-list-letter">{L}</h3>
        {byLetter.get(L)!.map((d) => {
          const dishName = locale === 'en' ? d.data.names.en : d.data.names.yue_hant;
          const heroImg = d.data.images?.[0];
          const thumb = heroImg ? commonsThumb(heroImg.path, 80) : null;
          return (
            <a class="app-list-row" href={`${base}/${locale}/dishes/${d.id}`}>
              <span class="app-list-thumb" style={thumb ? `background-image: url('${thumb}');` : ''}></span>
              <span class="app-list-name">{dishName}</span>
              <span class="app-list-meta">{d.data.names.jyutping}</span>
            </a>
          );
        })}
      </div>
    ))}
  </div>
</section>

<style is:global>
  .hub-panel--applist {
    overflow-y: auto;
  }
  .app-list {
    padding: 1rem 1.5rem 3rem;
    max-width: 720px;
    margin: 0 auto;
  }
  .app-list-letter {
    font-family: var(--sans);
    font-size: 1.25rem;
    font-weight: 200;
    color: var(--m-red);
    letter-spacing: 0.12em;
    margin: 1.5rem 0 0.5rem;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 0.25rem;
  }
  .app-list-row {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--rule);
  }
  .app-list-row:hover {
    background: var(--plate);
    color: var(--ink);
  }
  .app-list-thumb {
    width: 40px; height: 40px;
    background: var(--plate-dark);
    background-size: cover;
    background-position: center;
  }
  .app-list-name {
    font-family: var(--sans), var(--sans-zh);
    font-size: 1rem;
    font-weight: 300;
  }
  .app-list-meta {
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--ink-dim);
  }
</style>
```

- [ ] **Step 2: Create /[locale]/all route**

Write `site/src/pages/[locale]/all.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import Hub from '~/components/Hub.astro';

export function getStaticPaths() {
  return [
    { params: { locale: 'zh' } },
    { params: { locale: 'yue' } },
    { params: { locale: 'en' } },
  ];
}

const { locale } = Astro.params;
const dict = {
  zh: { title: '所有菜式' },
  yue: { title: '所有菜式' },
  en: { title: 'All dishes' },
}[locale as 'zh'|'yue'|'en'];
---
<BaseLayout title={dict.title} locale={locale as 'zh'|'yue'|'en'}>
  <Hub locale={locale as 'zh'|'yue'|'en'} initialPanel="all" />
</BaseLayout>
```

- [ ] **Step 3: Modify Hub.astro to render the AppList panel between Home and Categories**

In `site/src/components/Hub.astro`:

(a) Add to frontmatter imports:
```ts
import AppListPanel from '~/components/AppListPanel.astro';
```

(b) Add to the `dict` object an `applist_label` key per locale:
- `zh`: `applist_label: '所有菜式'`
- `yue`: `applist_label: '所有菜式'`
- `en`: `applist_label: 'All dishes'`

(c) Update `initialTitle` to handle `initialPanel === 'all'`:
```ts
const initialTitle =
  initialPanel === 'home' ? dict.home_label
  : initialPanel === 'all' ? dict.applist_label
  : (() => {
      const c = allCats.find((c) => c.id === initialPanel);
      return c ? nameOf(c) : dict.home_label;
    })();
```

(d) Right after the `<!-- Panel 0: HOME -->` `</section>` (and before `<!-- Panels ... CATEGORIES -->`), insert:
```astro
  <!-- Panel 1: APPLIST -->
  <AppListPanel
    locale={locale}
    dishes={allDishes}
    base={base}
    dataUrl={`${base}/${locale}/all`}
    panelName={dict.applist_label}
  />
```

- [ ] **Step 4: Manual smoke test**

In a browser:
- Visit `/zh/` — first panel is Start Menu
- Pivot next → second panel is AppList (A-Z dish list)
- Pivot next → third panel is `appetizer`
- Pivot prev wraps from Start to `main` (the last category)
- Visit `/zh/all` directly — initial panel is AppList
- Click a dish row — navigates to dish page

- [ ] **Step 5: Commit**

```bash
git add site/src/components/AppListPanel.astro site/src/pages/\[locale\]/all.astro site/src/components/Hub.astro
git commit -m "feat: AppList panel + /[locale]/all route"
```

---

### Task 13: Update Hub nav script to handle 10 panels (peek text + wrap math)

**Spec mapping:** step 7 second half. The Hub nav code in `hubScripts.ts` already uses `panels.length`, so the wrap math is correct automatically. This task verifies and adds an AppList-specific probe.

**Files:**
- Create: `site/scripts/probe-app-list.mjs`
- Modify: `site/src/lib/hubScripts.ts` only if a bug surfaces

- [ ] **Step 1: Write the AppList probe**

Write `site/scripts/probe-app-list.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });

const data = await page.evaluate(() => {
  const panels = Array.from(document.querySelectorAll('.hub-panel'));
  const rows = Array.from(document.querySelectorAll('.app-list-row'));
  return {
    panelCount: panels.length,
    panelTypes: panels.map((p) => p.dataset.panel),
    rowCount: rows.length,
    firstRowName: rows[0]?.querySelector('.app-list-name')?.textContent,
    lastRowName: rows[rows.length - 1]?.querySelector('.app-list-name')?.textContent,
    letters: Array.from(document.querySelectorAll('.app-list-letter')).map((h) => h.textContent),
    pivotTitle: document.getElementById('hub-pivot-title')?.textContent,
    activePanel: panels.find((p) => p.dataset.panel === 'all')?.getBoundingClientRect().left,
  };
});

await page.screenshot({ path: 'site/probe-out/app-list.png', fullPage: true });
writeFileSync('site/probe-out/app-list.json', JSON.stringify(data, null, 2));
console.log(JSON.stringify(data, null, 2));
await browser.close();

let ok = true;
if (data.panelCount !== 10) { console.error(`FAIL: expected 10 panels, got ${data.panelCount}`); ok = false; }
if (data.panelTypes[1] !== 'all') { console.error(`FAIL: panel index 1 should be 'all', got '${data.panelTypes[1]}'`); ok = false; }
if (data.rowCount !== 66) { console.error(`FAIL: expected 66 dish rows, got ${data.rowCount}`); ok = false; }
if (Math.abs(data.activePanel ?? -999) > 5) { console.error(`FAIL: AppList panel not in view (left=${data.activePanel})`); ok = false; }
if (!data.letters || data.letters.length < 5) { console.error(`FAIL: section headers missing (got ${data.letters?.length})`); ok = false; }
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe**

```bash
node site/scripts/probe-app-list.mjs
```

Expected: 10 panels, panel index 1 = "all", 66 rows, AppList panel visible at scrollLeft offset.

- [ ] **Step 3: Verify pivot wrap from AppList**

```bash
node -e "
import('playwright').then(async ({ chromium }) => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
  // Click pivot next 9 times — should wrap back to AppList
  for (let i = 0; i < 9; i++) {
    await p.click('#hub-pivot-next');
    await p.waitForTimeout(400);
  }
  const title = await p.evaluate(() => document.getElementById('hub-pivot-title')?.textContent);
  console.log('Title after 9 next-clicks from all:', title);
  await b.close();
  if (title !== '所有菜式') process.exit(1);
});
"
```

Expected: prints "Title after 9 next-clicks from all: 所有菜式" — wrap completed correctly through 10 panels.

- [ ] **Step 4: Commit (probe-only commit)**

```bash
git add site/scripts/probe-app-list.mjs
git commit -m "test: AppList panel probe + verify 10-panel wrap math"
```

---

## Phase 6 — Cleanup + QA + PR (spec steps 8-10)

### Task 14: Delete dead CSS + remove /metro-test smoke route

**Spec mapping:** step 8.

**Files:**
- Modify: `site/src/components/Hub.astro` (strip unused custom tile CSS from the `<style>` block)
- Delete: `site/src/pages/[locale]/metro-test.astro`

- [ ] **Step 1: Identify dead CSS in Hub.astro**

Open `site/src/components/Hub.astro` `<style>` block. Delete rules for selectors NO LONGER present in the markup after T7-T13:
- `.tile`, `.face`, `.live-tile-face`, `.live-tile`, `.stat-tile.stat-complete/.stat-draft/.stat-stub/.stat-total` (replaced by `.cat-tile` + inline styles)
- `.start-screen` (replaced by `.tiles-grid.start-tiles`)
- `.dish-card`, `.dish-card.has-back`, `.card-face`, `.card-front`, `.card-back`, `.card-no`, `.card-name`, `.card-jyut`, `.card-zh-en`, `.card-foot`, `.card-ings`, `.card-photo` (replaced by `.dish-tile`)
- `.panorama`, `.panorama-stripe`, `.panorama-title`, `.panorama-sub`, `.panorama-dot` (no panorama in Start Menu)
- `.pivot-h`, `.pivot-section`, `.pivot-label`, `.prog-track`, `.prog-seg`, `.prog-complete`, `.prog-draft` (no progress bar — stats are tiles now)
- `.cat-hero`, `.cat-no`, `.cat-name`, `.cat-desc`, `.cat-langs` (no category hero — pivot title names the cat)
- `.dish-grid` (replaced by `.tiles-grid.browse-tiles`)
- Old `.featured-tile`, `.featured-face`, `.featured-img`, `.featured-overlay`, `.featured-label` rules — keep only the ones that remain referenced in the new markup (verify each grep-by-selector)

**Method:** for each rule, search the markup once (`grep -F "className"` on Hub.astro + AppListPanel.astro + CatTile.astro). If 0 matches, delete the rule.

- [ ] **Step 2: Delete the smoke test page**

```bash
rm "site/src/pages/[locale]/metro-test.astro"
```

- [ ] **Step 3: Run all probes to confirm no regressions**

```bash
node site/scripts/probe-spa-nav.mjs
node site/scripts/probe-panel-clip.mjs
node site/scripts/probe-pivot-peek.mjs
node site/scripts/probe-cat-tile.mjs
node site/scripts/probe-css-leak.mjs
node site/scripts/probe-theme-tiles.mjs
node site/scripts/probe-app-list.mjs
```

All exit 0.

- [ ] **Step 4: `pnpm build` to catch broken refs in dead CSS removal**

```bash
cd site && pnpm build
```

Expected: clean build. If Astro warns about unused selectors or fails on a missing reference, restore the relevant rule.

- [ ] **Step 5: Commit**

```bash
git add -A site/src/components/Hub.astro
git rm "site/src/pages/[locale]/metro-test.astro"
git commit -m "chore: remove dead tile CSS + metro-test smoke route"
```

---

### Task 15: Final QA sweep across viewports + locales + pages

**Spec mapping:** step 9.

**Files:**
- Create: `site/scripts/probe-final-sweep.mjs`

- [ ] **Step 1: Write the sweep probe**

Write `site/scripts/probe-final-sweep.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out/sweep', { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 667 },
];
const LOCALES = ['zh', 'yue', 'en'];
const ROUTES = (loc) => [
  { name: 'home',         path: `/${loc}/` },
  { name: 'all',          path: `/${loc}/all` },
  { name: 'browse-noodle', path: `/${loc}/browse/noodle` },
  { name: 'browse-rice',   path: `/${loc}/browse/rice` },
  { name: 'browse-main',   path: `/${loc}/browse/main` },
  { name: 'dish',         path: `/${loc}/dishes/dish-01` },
  { name: 'ingredient',   path: `/${loc}/ingredients/ing-pork-belly` },
  { name: 'sauce',        path: `/${loc}/sauces/soy-sauce` },
  { name: 'search',       path: `/${loc}/search` },
  { name: '404',          path: `/${loc}/this-does-not-exist` },
];

const browser = await chromium.launch();
const allErrors = [];

for (const vp of VIEWPORTS) {
  for (const loc of LOCALES) {
    for (const route of ROUTES(loc)) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push({ kind: 'pageerror', msg: e.message }));
      page.on('console', (m) => { if (m.type() === 'error') pageErrors.push({ kind: 'console', msg: m.text() }); });
      try {
        await page.goto('http://localhost:4321/cantopedia' + route.path, { waitUntil: 'networkidle', timeout: 10000 });
      } catch (e) {
        pageErrors.push({ kind: 'goto', msg: e.message });
      }
      const fname = `${vp.name}-${loc}-${route.name}.png`;
      await page.screenshot({ path: `site/probe-out/sweep/${fname}`, fullPage: true });
      if (pageErrors.length > 0) {
        allErrors.push({ vp: vp.name, locale: loc, route: route.name, errors: pageErrors });
      }
      await ctx.close();
    }
  }
}

writeFileSync('site/probe-out/sweep-errors.json', JSON.stringify(allErrors, null, 2));
console.log(`Total error events: ${allErrors.length}`);
await browser.close();
process.exit(allErrors.length === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the sweep**

```bash
node site/scripts/probe-final-sweep.mjs
```

Expected: 90 screenshots (3 viewports × 3 locales × 10 routes). 0 page errors. If non-zero, inspect `site/probe-out/sweep-errors.json` and fix.

- [ ] **Step 3: Visual review of screenshots**

Open `site/probe-out/sweep/` and spot-check 10-15 screenshots across the matrix. Look for:
- Tile gaps at 375px viewport (responsive scale should hide them)
- CJK text breaking mid-character (any tile with text overflow?)
- Theme: do dark-mode screenshots have correct background?
- Dish/ingredient/sauce pages: are they unaffected by Metro CSS? (No Metro should leak there.)

- [ ] **Step 4: Run all individual probes one last time**

```bash
for p in spa-nav panel-clip pivot-peek cat-tile css-leak theme-tiles app-list; do
  echo "=== probe-$p ==="
  node site/scripts/probe-$p.mjs || echo "FAILED: $p"
done
```

All should exit 0. Fix any failures.

- [ ] **Step 5: Build + preview**

```bash
cd site && pnpm build && pnpm preview
```

Visit http://localhost:4321/cantopedia/ in browser; sanity-check the built output (Astro static SSG can sometimes behave differently than dev mode).

- [ ] **Step 6: Commit**

```bash
git add site/scripts/probe-final-sweep.mjs
git commit -m "test: full QA sweep — 3 viewports × 3 locales × 10 routes"
```

(If any spec-divergent fixes were needed during the sweep, commit them in a separate commit first with a clear message.)

---

### Task 16: Open the PR

**Spec mapping:** step 10.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/wp10-metroui
```

- [ ] **Step 2: Open PR via gh**

```bash
gh pr create --title "WP10 Mobile Start Menu redesign with @olton/metroui" --body "$(cat <<'EOF'
## Summary
- Refactor the Hub from custom WP10-inspired CSS to @olton/metroui (v5.1.20+) tiles
- Drop hamburger drawer + focus-trap dependency; theme/search/github move to Start Menu utility tiles
- Add AppList panel (A-Z dish index) + `/[locale]/all` route — total 10 panels
- Restore the SPA-nav reinit, panel-clip, and pivot-peek fixes lost in the `cee6736` rollback
- Each step is verified by a dedicated Playwright probe under `site/scripts/probe-*.mjs`

## Spec + Plan
- Spec: `docs/superpowers/specs/2026-05-25-wp10-metroui-design.md`
- Plan: `docs/superpowers/plans/2026-05-25-wp10-metroui-impl.md`

## Test plan
- [x] All 7 probes pass: `probe-spa-nav`, `probe-panel-clip`, `probe-pivot-peek`, `probe-cat-tile`, `probe-css-leak`, `probe-theme-tiles`, `probe-app-list`
- [x] Final sweep: 90 screenshots (3 viewports × 3 locales × 10 routes), 0 page errors
- [x] `pnpm build && pnpm preview` clean
- [ ] Reviewer: confirm dish/ingredient/sauce/search/404 pages are unaffected by Metro CSS
- [ ] Reviewer: confirm theme persistence across Hub ↔ non-Hub navigation
- [ ] Reviewer: confirm pivot wrap (modulo 10) works at AppList → Start → AppList

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report URL to user**

The `gh pr create` output prints the PR URL. Share it back as the final message of this implementation.

---

## Self-review checklist (run after plan execution begins, before each commit)

For each Task before its commit:
- [ ] Did the relevant probe pass with exit 0?
- [ ] Did regression probes (all prior probes) still pass?
- [ ] Did any unintended file change sneak into `git diff`? If yes, revert it.
- [ ] Is the commit message in the style of the existing repo log (`feat:`, `fix:`, `chore:`, `refactor:`, `test:` prefix; lowercase; ~70 char subject)?

For the full plan before final PR:
- [ ] Spec section "Inventory" — all 4 listed bugs (SPA-nav, panel clip, pivot math, tile CJK overflow) addressed? Yes — T2, T3, T4 cover them; tile CJK overflow handled by `word-break: keep-all; overflow-wrap: anywhere` in CatTile.astro.
- [ ] Spec section "Target state table" — all 4 metroui-loading routes wired? home (T7), all (T12), browse/[cat] (T11), metro-test (T1→T14 deleted).
- [ ] Spec section "What to drop" — every item gone? Verify with `git diff cee6736 HEAD -- site/`:
  - `.tile`, `.face`, `.live-tile-face` — T14
  - `.featured-tile` custom CSS — partially kept (we still use `.featured-face` markup, see T7 step 3); rule-by-rule audit in T14
  - `.stat-tile` + `.stat-tiles` — T14
  - `.start-screen` — T14
  - `.panorama` family — T14
  - `.dish-grid` + `.dish-card` family — T14
  - `.cat-hero` family — T14
  - Old live-tile flip script — replaced by `initCatTileCycle` in T6
  - `<button class="hamburger">` + CSS — T10
  - `.nav-drawer` + scrim + drawer-* CSS — T10
  - Drawer JS + focus-trap — T10
  - Unused dict keys + drawerCategories/categoryCounts — T10
  - focus-trap dependency — T10 step 5

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-25-wp10-metroui-impl.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan: many independent UI tasks, each with a clear probe-verified contract.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
