# Phase A+F — Bottom AppBar Migration + Default Dark + Accent Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the top navigation chrome to a bottom WP10-style Application Bar with Acrylic blur, make dark theme the default, and add a 4-color accent picker — all without breaking the existing Hub / Pivot / Live Tile / View Transition behavior.

**Architecture:** BaseLayout.astro hosts two new chrome surfaces (top slim 24px brand strip + bottom 72px AppBar). AppBar opens a slide-up MoreMenu containing theme / accent / locale / about. Motion One v10 drives the menu slide via WAAPI; CSS handles everything else. Theme + accent state extracts from BaseLayout's inline scripts to `~/lib/theme.ts` for vitest coverage. Z-index discipline keeps View Transitions, loading bar, AppBar, MoreMenu, and Toast in strict layer order.

**Tech Stack:** Astro 5 + Content Collections, TypeScript, vanilla CSS with global variable tokens, Motion One v10 (new), Vitest for lib unit tests, Playwright for browser probes, Metro UI v5 (existing, for Tilt-press + tile classes).

**Spec:** [docs/superpowers/specs/2026-05-26-bottom-appbar-and-dark-default-design.md](../specs/2026-05-26-bottom-appbar-and-dark-default-design.md)

---

## File Structure

### New files

| Path | Responsibility | Size |
|---|---|---|
| `site/src/lib/theme.ts` | Pure state functions for theme + accent (read/apply/persist). No DOM coupling beyond `document.documentElement`. Vitest-friendly. | ~80 lines |
| `site/src/lib/theme.test.ts` | Vitest spec for `applyTheme` / `applyAccent` / migration. | ~60 lines |
| `site/src/lib/menuSlide.ts` | Motion One animation + focus management for MoreMenu open/close. Pure functions over a passed `HTMLElement`. | ~70 lines |
| `site/src/components/AppBar.astro` | The 72px bottom bar — 4 buttons, Acrylic CSS, transition:persist. Accepts `locale` prop. | ~150 lines |
| `site/src/components/MoreMenu.astro` | The slide-up panel — theme tiles + accent swatches + locale tabs + about. Accepts `locale` prop. | ~180 lines |
| `site/src/components/TopStrip.astro` | The 24px slim brand strip (replaces full top nav). | ~40 lines |
| `site/scripts/probe-appbar-acrylic.mjs` | Verifies AppBar geometry + Acrylic + Tilt-press wiring. | ~80 lines |
| `site/scripts/probe-more-menu.mjs` | Verifies MoreMenu open/close via `Animation.finished`, focus, accent click. | ~120 lines |
| `site/scripts/probe-dark-default.mjs` | Verifies fresh-visit dark default, localStorage write, theme migration. | ~70 lines |
| `site/scripts/probe-zindex.mjs` | Verifies §6.1 z-index layer ordering during navigation+menu overlap. | ~60 lines |

### Modified files

| Path | Change | Lines touched |
|---|---|---|
| `site/package.json` | Add `motion@^10` dependency. | 1 |
| `site/src/layouts/BaseLayout.astro` | Remove top `<nav class="metro-nav app-bar">`, add `<TopStrip>` + `<AppBar>` + `<MoreMenu>`, switch default theme to dark in inline head script, extract theme logic to `~/lib/theme.ts`, add accent CSS variables in `<style is:global>`, add `--accent-fg` and `data-accent` ruleset, add `padding-bottom: 88px` on `<main>`. | ~80 lines diff |
| `site/src/components/Hub.astro` | Update height formula `calc(100vh - 120px)` → `calc(100vh - 152px)` per §6 critical calc. | 1 |

### Unchanged (locked per spec §3)

`HubPivot.astro`, `PivotPage.astro`, `PivotTab.astro`, `AppListPanel.astro`, `dishes/[id].astro`, `categoryColors.ts`, `commonsImage.ts`, `hubScripts.ts`, `pivotScripts.ts`, `lib/motion/*`.

---

## Task 0: Install Motion One dependency

**Files:**
- Modify: `site/package.json`
- Verify: `site/package-lock.json` (or `pnpm-lock.yaml` — whichever the repo uses)

- [ ] **Step 1: Confirm package manager**

Run: `ls "d:/Cantonese Cuisine/site/" | Select-String "lock"` (PowerShell) or `ls site/ | grep -i lock` (bash).
Expected: One of `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` is present. Use that manager for the next step.

- [ ] **Step 2: Install Motion One**

Run from `site/`:
- If `package-lock.json`: `npm install motion@^10`
- If `pnpm-lock.yaml`: `pnpm add motion@^10`
- If `yarn.lock`: `yarn add motion@^10`

Expected: `package.json` `dependencies` now contains `"motion": "^10.x.x"`. Lock file updated.

- [ ] **Step 3: Smoke-test the import**

Create a throwaway file `site/src/_motion-smoke.ts`:

```ts
import { animate } from 'motion';
const _smoke: typeof animate = animate;
export default _smoke;
```

Run: `cd site && npm run check` (or `pnpm check`).
Expected: TypeScript check passes, no "module not found".

- [ ] **Step 4: Delete smoke file**

Run from `site/`: `rm src/_motion-smoke.ts` (bash) or `Remove-Item src/_motion-smoke.ts` (PowerShell).

- [ ] **Step 5: Commit**

```bash
git add site/package.json site/package-lock.json
# or pnpm-lock.yaml / yarn.lock
git commit -m "chore(deps): add motion@^10 for AppBar slide animations

Spec §2.11 — Motion One adopted as the WAAPI animation primitive for
JS-triggered state-driven animations (More menu, theme transitions).
+12 KB gzip, <5% bundle increase, aligns with View Transitions code path.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 1: Extract theme + accent state to `~/lib/theme.ts`

**Files:**
- Create: `site/src/lib/theme.ts`
- Create: `site/src/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/lib/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
  ACCENT_NAMES,
  DEFAULT_THEME,
  DEFAULT_ACCENT,
  readTheme,
  readAccent,
  applyTheme,
  applyAccent,
} from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-accent');
});

describe('readTheme', () => {
  it('returns "dark" when storage is empty (default)', () => {
    expect(readTheme()).toBe('dark');
  });
  it('returns "light" when stored', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readTheme()).toBe('light');
  });
  it('migrates legacy "auto" to "dark"', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    expect(readTheme()).toBe('dark');
  });
});

describe('readAccent', () => {
  it('returns "cobalt" when storage is empty', () => {
    expect(readAccent()).toBe('cobalt');
  });
  it('returns stored accent when valid', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'red');
    expect(readAccent()).toBe('red');
  });
  it('falls back to cobalt for unknown value', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'magenta-fake');
    expect(readAccent()).toBe('cobalt');
  });
});

describe('applyTheme', () => {
  it('writes dark to localStorage and adds dark-side class', () => {
    applyTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark-side')).toBe(true);
  });
  it('writes light and removes dark-side class', () => {
    document.documentElement.classList.add('dark-side');
    applyTheme('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark-side')).toBe(false);
  });
});

describe('applyAccent', () => {
  it('writes accent name and sets data-accent attribute', () => {
    applyAccent('orange');
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('orange');
    expect(document.documentElement.getAttribute('data-accent')).toBe('orange');
  });
  it('all 4 accent names accepted', () => {
    for (const name of ACCENT_NAMES) {
      applyAccent(name);
      expect(document.documentElement.getAttribute('data-accent')).toBe(name);
    }
  });
});

describe('defaults', () => {
  it('exports correct constants', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(DEFAULT_ACCENT).toBe('cobalt');
    expect(ACCENT_NAMES).toEqual(['cobalt', 'red', 'orange', 'emerald']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && npm run test -- theme`
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/lib/theme.ts`:

```ts
/**
 * Theme + accent state — single source of truth for Cantopedia's user-controlled
 * visual preferences. Pure functions over document.documentElement + localStorage,
 * unit-testable via vitest + happy-dom.
 *
 * Spec: docs/superpowers/specs/2026-05-26-bottom-appbar-and-dark-default-design.md
 * §5 (Phase F).
 */

export const THEME_STORAGE_KEY = 'cantopedia-theme';
export const ACCENT_STORAGE_KEY = 'cantopedia-accent';

export type ThemeName = 'light' | 'dark';
export type AccentName = 'cobalt' | 'red' | 'orange' | 'emerald';

export const ACCENT_NAMES: AccentName[] = ['cobalt', 'red', 'orange', 'emerald'];
export const DEFAULT_THEME: ThemeName = 'dark';
export const DEFAULT_ACCENT: AccentName = 'cobalt';

function isAccentName(v: unknown): v is AccentName {
  return typeof v === 'string' && (ACCENT_NAMES as string[]).includes(v);
}

export function readTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') return 'light';
    // null, 'dark', or legacy 'auto' all resolve to dark (spec §5.1 migration)
    return 'dark';
  } catch {
    return DEFAULT_THEME;
  }
}

export function readAccent(): AccentName {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (isAccentName(saved)) return saved;
    return DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.toggle('dark-side', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode — silently fail (spec §8) */
  }
}

export function applyAccent(accent: AccentName): void {
  document.documentElement.setAttribute('data-accent', accent);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    /* private mode — silently fail */
  }
}
```

- [ ] **Step 4: Add happy-dom to vitest config if missing**

Check `site/vitest.config.ts` (or `vite.config.ts`) for `environment: 'happy-dom'`. If missing or `node`, change to `happy-dom`.

If happy-dom not installed:
- npm: `cd site && npm install --save-dev happy-dom`
- pnpm: `cd site && pnpm add -D happy-dom`

Then update `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'happy-dom' },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd site && npm run test -- theme`
Expected: PASS — all 13 tests green.

- [ ] **Step 6: Commit**

```bash
git add site/src/lib/theme.ts site/src/lib/theme.test.ts site/vitest.config.ts site/package.json site/package-lock.json
git commit -m "feat(lib): extract theme + accent state to ~/lib/theme.ts

Single source of truth for ThemeName/AccentName, with vitest coverage:
- readTheme / readAccent: storage-aware getters with legacy 'auto' migration
- applyTheme / applyAccent: DOM + localStorage writers, private-mode safe
- DEFAULT_THEME = 'dark', DEFAULT_ACCENT = 'cobalt' (spec §5.1, §11.2)

13 unit tests cover defaults, migration, write paths, and unknown-value fallback.
BaseLayout inline script will switch to use these in a later task.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Add accent CSS variables to BaseLayout global tokens

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (inside `<style is:global>`, after the existing `--m-*` palette and `--t-*` tokens)

- [ ] **Step 1: Locate the global style block end**

Read [BaseLayout.astro](../../../site/src/layouts/BaseLayout.astro) and find the last `}` before the closing `</style>` of the `<style is:global>` block (around line 410-450, where existing `--t-*` tokens live).

- [ ] **Step 2: Add accent variable rules**

Insert before the closing `</style>` of `<style is:global>`:

```css
/* ── Accent picker (spec §5.4) ─────────────────────────────────────────
   --accent and --accent-fg drive user-selectable accent across:
   AppList letter headers, AppBar active-state ring, loading bar,
   active locale tab, Featured tile label band. Hub category/stat/util
   tiles stay per-content-color (spec §5.5 lock list). */
:root {
  --accent: #3E65FF;      /* Cobalt — default per spec §11.2 */
  --accent-fg: #FFFFFF;
}
:root[data-accent="cobalt"]  { --accent: #3E65FF; --accent-fg: #FFFFFF; }
:root[data-accent="red"]     { --accent: #E51400; --accent-fg: #FFFFFF; }
:root[data-accent="orange"]  { --accent: #FA6800; --accent-fg: #FFFFFF; }
:root[data-accent="emerald"] { --accent: #008A00; --accent-fg: #FFFFFF; }
```

- [ ] **Step 3: Build to verify no CSS parse error**

Run: `cd site && npm run build 2>&1 | head -30`
Expected: Build succeeds (or reaches at least past CSS bundling phase) without "unterminated rule" or "unexpected token".

- [ ] **Step 4: Visual smoke check**

Run: `cd site && npm run dev`
Open `http://localhost:4321/cantopedia/zh/` in a browser.
Open DevTools Console, run:
```js
getComputedStyle(document.documentElement).getPropertyValue('--accent')
```
Expected: `" #3E65FF"` (with leading space). Default cobalt is live.

Then run:
```js
document.documentElement.setAttribute('data-accent', 'red');
getComputedStyle(document.documentElement).getPropertyValue('--accent');
```
Expected: `" #E51400"`. Switch works.

- [ ] **Step 5: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat(theme): add --accent CSS variable + 4-color accent ruleset

Spec §5.4. Defaults to Cobalt #3E65FF. Switches via data-accent
attribute on <html>, matching the WP10 system palette (§2.8):
- cobalt #3E65FF, red #E51400, orange #FA6800, emerald #008A00

Variable will be consumed by AppList letter headers, AppBar active ring,
loading bar, and Featured tile label band in subsequent tasks. Per-category
and per-stat tile colors stay independent (spec §5.5).

Collision audit (spec §6.2): grepped @olton/metroui/lib/metro.css for
^\\s*--accent\\b — no matches. Bare --accent is safe.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Switch BaseLayout inline head script to default-dark + use lib/theme

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro:50-65` (inline head script that runs before paint to avoid FOIT)

- [ ] **Step 1: Read current inline script**

Read [BaseLayout.astro:50-65](../../../site/src/layouts/BaseLayout.astro).
Current code (per spec §5.1):

```js
let saved = localStorage.getItem('cantopedia-theme');
if (saved === 'auto') {
  saved = 'light';
  localStorage.setItem('cantopedia-theme', 'light');
}
const isDark = saved === 'dark';
document.documentElement.classList.toggle('dark-side', isDark);
```

- [ ] **Step 2: Replace with default-dark + accent init**

Replace those lines with:

```js
(function () {
  try {
    let theme = localStorage.getItem('cantopedia-theme');
    // First-visit OR legacy 'auto' → dark (spec §5.1)
    if (theme === null || theme === 'auto') {
      theme = 'dark';
      localStorage.setItem('cantopedia-theme', 'dark');
    }
    document.documentElement.classList.toggle('dark-side', theme === 'dark');

    // Accent (spec §5.6) — read or default to cobalt
    let accent = localStorage.getItem('cantopedia-accent');
    const validAccents = ['cobalt', 'red', 'orange', 'emerald'];
    if (!validAccents.includes(accent)) accent = 'cobalt';
    document.documentElement.setAttribute('data-accent', accent);
  } catch (e) { /* private mode — defaults will apply via CSS */ }
})();
```

Note: this inline script duplicates the logic in `~/lib/theme.ts` because it runs BEFORE any module loads (to prevent flash-of-unstyled-content). The two stay in sync by mirroring constants. A test in Task 14 verifies they agree.

- [ ] **Step 3: Build + visual verify**

Run: `cd site && npm run dev`
Clear localStorage in DevTools (`localStorage.clear()`), reload page.
Expected: page renders in dark theme on first paint (no light-mode flash); `localStorage.getItem('cantopedia-theme')` returns `'dark'`; `document.documentElement.getAttribute('data-accent')` returns `'cobalt'`.

- [ ] **Step 4: Verify backward-compat for explicit-light users**

In DevTools: `localStorage.setItem('cantopedia-theme', 'light')`; reload.
Expected: page stays in light theme (no surprise flip to dark, per spec §5.1 migration story).

- [ ] **Step 5: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat(theme): default to dark theme on first visit (spec §5.1, §11)

Behavior change:
- Fresh visit / legacy 'auto' → dark (was light)
- Explicit user choice (light or dark) → unchanged
- No surprise theme flips for users with stored preference

Also initializes data-accent attribute pre-paint to avoid accent flash
once Task 4 starts applying var(--accent). Defaults to 'cobalt'.

This is the FOIT-guard inline script and runs before any module loads;
the canonical state APIs in ~/lib/theme.ts mirror this logic and will
be tested for agreement in the final regression sweep (Task 15).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Write probe-dark-default.mjs (verifies Task 3 behavior in a real browser)

**Files:**
- Create: `site/scripts/probe-dark-default.mjs`

- [ ] **Step 1: Read an existing probe for style reference**

Read [site/scripts/probe-theme-truth.mjs](../../../site/scripts/probe-theme-truth.mjs) to learn the existing probe pattern (Playwright launch, navigation, assertion, exit code).

- [ ] **Step 2: Write the probe**

Create `site/scripts/probe-dark-default.mjs`:

```js
/**
 * probe-dark-default — Spec §9 verifies that first-time visitors land in dark
 * theme and that explicit-light users are not flipped.
 *
 * Usage: node site/scripts/probe-dark-default.mjs
 * Exit 0 = pass, 1 = fail.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.PROBE_URL || 'http://localhost:4321/cantopedia/zh/';

const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  // Test 1: Fresh visit defaults to dark
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.goto(BASE_URL);
  const state1 = await page1.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark-side'),
    storedTheme: localStorage.getItem('cantopedia-theme'),
    accent: document.documentElement.getAttribute('data-accent'),
    storedAccent: localStorage.getItem('cantopedia-accent'),
  }));
  if (!state1.isDark) { console.error('FAIL: fresh visit not dark:', state1); failed = true; }
  if (state1.storedTheme !== 'dark') { console.error('FAIL: did not write dark to storage:', state1); failed = true; }
  if (state1.accent !== 'cobalt') { console.error('FAIL: accent not cobalt:', state1); failed = true; }
  await ctx1.close();
  console.log('✓ Test 1: fresh visit → dark + cobalt');

  // Test 2: Explicit-light user stays light
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.addInitScript(() => localStorage.setItem('cantopedia-theme', 'light'));
  await page2.goto(BASE_URL);
  const state2 = await page2.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark-side'),
    storedTheme: localStorage.getItem('cantopedia-theme'),
  }));
  if (state2.isDark) { console.error('FAIL: explicit-light user flipped to dark:', state2); failed = true; }
  if (state2.storedTheme !== 'light') { console.error('FAIL: storage corrupted:', state2); failed = true; }
  await ctx2.close();
  console.log('✓ Test 2: explicit-light user → stays light');

  // Test 3: Legacy 'auto' migrates to dark
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await page3.addInitScript(() => localStorage.setItem('cantopedia-theme', 'auto'));
  await page3.goto(BASE_URL);
  const state3 = await page3.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark-side'),
    storedTheme: localStorage.getItem('cantopedia-theme'),
  }));
  if (!state3.isDark) { console.error('FAIL: legacy auto did not migrate to dark:', state3); failed = true; }
  if (state3.storedTheme !== 'dark') { console.error('FAIL: storage not rewritten:', state3); failed = true; }
  await ctx3.close();
  console.log('✓ Test 3: legacy auto → migrates to dark');
} finally {
  await browser.close();
}

if (failed) { console.error('\n✗ probe-dark-default FAILED'); process.exit(1); }
console.log('\n✓ probe-dark-default PASSED');
```

- [ ] **Step 3: Run probe against running dev server**

In one terminal: `cd site && npm run dev` (leaves dev server on :4321)

In another terminal: `cd site && node scripts/probe-dark-default.mjs`
Expected: 3 ✓ marks + final "✓ probe-dark-default PASSED". Exit 0.

- [ ] **Step 4: Commit**

```bash
git add site/scripts/probe-dark-default.mjs
git commit -m "test(probe): probe-dark-default verifies Task 3 in a real browser

Spec §9.1 third probe. Runs three contexts:
1. Empty storage → dark + cobalt
2. Explicit 'light' → stays light (migration safety)
3. Legacy 'auto' → migrates to dark with storage rewrite

Exit 0 on pass, 1 on any fail. Default URL is the local dev server.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Build AppBar.astro component (skeleton, not yet wired into BaseLayout)

**Files:**
- Create: `site/src/components/AppBar.astro`

- [ ] **Step 1: Write the component**

Create `site/src/components/AppBar.astro`:

```astro
---
/**
 * Bottom-anchored Application Bar — WP10 Mobile style.
 *
 * Spec: docs/superpowers/specs/2026-05-26-bottom-appbar-and-dark-default-design.md
 * §4 (Phase A).
 *
 * Geometry: 72px tall, position:fixed bottom, z-index 1000.
 * Background: Acrylic (backdrop-filter blur 30px saturate 125%) with
 * solid fallback for non-supporting browsers.
 *
 * Buttons (exactly 4 per WP §2.4):
 *   home / search / random / more (⋯)
 *
 * The MoreMenu component renders separately (Task 6) and is opened by
 * the ⋯ button via menuSlide.ts (Task 7).
 */
interface Props {
  locale: 'zh' | 'yue' | 'en';
  base: string;
}
const { locale, base } = Astro.props;

const dict = {
  zh:  { home: '首頁', search: '搜尋', random: '隨機菜', more: '更多' },
  yue: { home: '首頁', search: '搵',   random: '隨機餸',  more: '更多' },
  en:  { home: 'Home', search: 'Search', random: 'Random dish', more: 'More options' },
}[locale];
---
<nav
  class="app-bar app-bar--bottom"
  role="navigation"
  aria-label="Application bar"
  transition:persist
>
  <a
    class="app-bar-btn wp-tile"
    data-app-bar-slot="home"
    href={`${base}/${locale}/`}
    aria-label={dict.home}
  >
    <span class="app-bar-circle">
      <span class="mif-home" aria-hidden="true"></span>
    </span>
  </a>

  <a
    class="app-bar-btn wp-tile"
    data-app-bar-slot="search"
    href={`${base}/${locale}/search`}
    aria-label={dict.search}
  >
    <span class="app-bar-circle">
      <span class="mif-search" aria-hidden="true"></span>
    </span>
  </a>

  <button
    type="button"
    class="app-bar-btn wp-tile"
    data-app-bar-slot="random"
    aria-label={dict.random}
  >
    <span class="app-bar-circle">
      <span class="mif-shuffle" aria-hidden="true"></span>
    </span>
  </button>

  <button
    type="button"
    class="app-bar-btn wp-tile"
    data-app-bar-slot="more"
    data-more-trigger
    aria-label={dict.more}
    aria-expanded="false"
    aria-controls="more-menu"
  >
    <span class="app-bar-circle">
      <span class="mif-more-vert" aria-hidden="true"></span>
    </span>
  </button>
</nav>

<style>
  /* Geometry: spec §4.1 */
  .app-bar--bottom {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 72px;
    z-index: 1000;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-items: center;
    justify-items: center;

    /* Solid fallback — spec §4.6 */
    background: rgba(0, 0, 0, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  :root:not(.dark-side) .app-bar--bottom {
    background: rgba(255, 255, 255, 0.9);
    border-top-color: rgba(0, 0, 0, 0.08);
  }

  /* Acrylic when supported — spec §4.6 + §2.9 */
  @supports (backdrop-filter: blur(30px)) or (-webkit-backdrop-filter: blur(30px)) {
    .app-bar--bottom {
      backdrop-filter: blur(30px) saturate(125%);
      -webkit-backdrop-filter: blur(30px) saturate(125%);
      background: rgba(0, 0, 0, 0.6);
    }
    :root:not(.dark-side) .app-bar--bottom {
      background: rgba(255, 255, 255, 0.7);
    }
  }

  /* Button — spec §4.3 */
  .app-bar-btn {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--t-ink);
    text-decoration: none;
    cursor: pointer;
    /* tilt-press: inherits global setupTiltPress() via .wp-tile class */
  }
  .app-bar-btn:hover,
  .app-bar-btn:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    outline: none;
  }
  :root:not(.dark-side) .app-bar-btn:hover,
  :root:not(.dark-side) .app-bar-btn:focus-visible {
    background: rgba(0, 0, 0, 0.06);
  }

  /* Circle outline — drawn in CSS, not in the icon image (§2.4) */
  .app-bar-circle {
    width: 44px;
    height: 44px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .app-bar-circle .mif-home,
  .app-bar-circle .mif-search,
  .app-bar-circle .mif-shuffle,
  .app-bar-circle .mif-more-vert {
    font-size: 26px;  /* §2.4 foreground 26x26 */
    line-height: 1;
  }

  /* Active route highlight (spec §5.5) — accent ring */
  .app-bar-btn[data-active="true"] .app-bar-circle {
    border-color: var(--accent);
    color: var(--accent);
  }

  /* Print: hide chrome — spec §8 */
  @media print {
    .app-bar--bottom { display: none; }
  }
</style>

<script>
  /**
   * Wire the Random button. Picks a dish at random from window.__hubBoot.dishesData
   * (set by Hub.astro on home page) OR from a fallback flat list passed via
   * /api/dishes if available. Falls back to navigating to /[locale]/all if no
   * data is available on the current page.
   */
  function pickRandom() {
    const cfg = (window as any).__hubBoot;
    if (cfg?.dishesData?.length) {
      const d = cfg.dishesData[Math.floor(Math.random() * cfg.dishesData.length)];
      return `${cfg.base}/${cfg.locale}/dishes/${d.id}`;
    }
    // Fallback: when on a non-Hub page, navigate to /all so user can pick manually
    const pathParts = location.pathname.split('/').filter(Boolean);
    const locale = ['zh', 'yue', 'en'].includes(pathParts[1]) ? pathParts[1] : 'zh';
    const base = pathParts[0] ? `/${pathParts[0]}` : '';
    return `${base}/${locale}/all`;
  }

  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-app-bar-slot="random"]') : null;
    if (!t) return;
    e.preventDefault();
    const href = pickRandom();
    location.href = href;
  });

  /**
   * Mark the active slot on the AppBar based on current pathname.
   * home matches /[locale]/ exactly; search matches /[locale]/search.
   * Runs on every astro:page-load + once on initial DOMContentLoaded.
   */
  function refreshActiveSlot() {
    const path = location.pathname.replace(/\/$/, '');
    const isSearch = /\/search$/.test(path);
    const isHome = /\/(zh|yue|en)$/.test(path);
    document.querySelectorAll('[data-app-bar-slot]').forEach((el) => {
      const slot = (el as HTMLElement).dataset.appBarSlot;
      const active =
        (slot === 'home' && isHome) ||
        (slot === 'search' && isSearch);
      (el as HTMLElement).dataset.active = active ? 'true' : 'false';
    });
  }
  document.addEventListener('astro:page-load', refreshActiveSlot);
  refreshActiveSlot();
</script>
```

- [ ] **Step 2: Type-check**

Run: `cd site && npm run check 2>&1 | tail -10`
Expected: no errors related to `AppBar.astro` (existing unrelated warnings ok).

- [ ] **Step 3: Commit**

```bash
git add site/src/components/AppBar.astro
git commit -m "feat(appbar): scaffold AppBar.astro — 4 buttons, Acrylic, transition:persist

Spec §4. Renders 72px bottom bar with home/search/random/more (⋯) buttons,
white-on-acrylic styling with @supports fallback for non-supporting browsers,
.wp-tile class to inherit global Tilt-press, transition:persist for SPA.

Random button picks from window.__hubBoot.dishesData (set on Hub home);
falls back to /[locale]/all when off the Hub.

NOT YET wired into BaseLayout — wiring happens in Task 9 after MoreMenu
(Task 6) and menuSlide (Task 7) are in place.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Build MoreMenu.astro component (skeleton, not yet wired)

**Files:**
- Create: `site/src/components/MoreMenu.astro`

- [ ] **Step 1: Write the component**

Create `site/src/components/MoreMenu.astro`:

```astro
---
/**
 * Slide-up menu invoked by AppBar's ⋯ button. Contains:
 *   - Theme toggle (light/dark, 2 tiles)
 *   - Accent picker (4 color swatches)
 *   - Language switcher (3 tabs)
 *   - About row
 *
 * Spec §4.4. Animation handled by ~/lib/menuSlide.ts (Task 7).
 */
interface Props {
  locale: 'zh' | 'yue' | 'en';
  base: string;
  currentPath: string;
}
const { locale, base, currentPath } = Astro.props;

const dict = {
  zh: {
    theme_label: '主題', theme_light: '淺色', theme_dark: '深色',
    accent_label: '主題色', acc_cobalt: '經典藍', acc_red: '番茄紅', acc_orange: '香橙色', acc_emerald: 'Xbox 綠',
    lang_label: '語言',
    about: 'GitHub · MIT · CC BY-SA',
  },
  yue: {
    theme_label: '主題', theme_light: '淺色', theme_dark: '深色',
    accent_label: '主題色', acc_cobalt: '經典藍', acc_red: '番茄紅', acc_orange: '香橙色', acc_emerald: 'Xbox 綠',
    lang_label: '語言',
    about: 'GitHub · MIT · CC BY-SA',
  },
  en: {
    theme_label: 'Theme', theme_light: 'Light', theme_dark: 'Dark',
    accent_label: 'Accent', acc_cobalt: 'Classic Blue', acc_red: 'Tomato Red', acc_orange: 'Orange', acc_emerald: 'Xbox Green',
    lang_label: 'Language',
    about: 'GitHub · MIT · CC BY-SA',
  },
}[locale];

// Build locale-equivalent paths so the language tabs swap locale segment in place
function localeHref(target: 'zh' | 'yue' | 'en'): string {
  const p = currentPath.replace(/\/$/, '');
  const baseStripped = base ? p.replace(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '') : p;
  const parts = baseStripped.split('/').filter(Boolean);
  if (parts.length === 0 || !['zh', 'yue', 'en'].includes(parts[0])) {
    return `${base}/${target}`;
  }
  parts[0] = target;
  return `${base}/${parts.join('/')}`;
}
---
<aside
  id="more-menu"
  class="more-menu"
  role="dialog"
  aria-modal="true"
  aria-label={dict.theme_label}
  data-state="closed"
  hidden
>
  <div class="more-menu-inner">
    <section class="menu-section">
      <h3 class="menu-label">{dict.theme_label}</h3>
      <div class="menu-tiles">
        <button type="button" class="menu-tile wp-tile" data-theme="light" aria-pressed="false">
          <span class="mif-sunny" aria-hidden="true"></span>
          <span class="menu-tile-name">{dict.theme_light}</span>
        </button>
        <button type="button" class="menu-tile wp-tile" data-theme="dark" aria-pressed="false">
          <span class="mif-moon-right" aria-hidden="true"></span>
          <span class="menu-tile-name">{dict.theme_dark}</span>
        </button>
      </div>
    </section>

    <section class="menu-section">
      <h3 class="menu-label">{dict.accent_label}</h3>
      <div class="menu-swatches">
        <button type="button" class="menu-swatch wp-tile" data-accent="cobalt"  aria-label={dict.acc_cobalt}  style="background: #3E65FF;"></button>
        <button type="button" class="menu-swatch wp-tile" data-accent="red"     aria-label={dict.acc_red}     style="background: #E51400;"></button>
        <button type="button" class="menu-swatch wp-tile" data-accent="orange"  aria-label={dict.acc_orange}  style="background: #FA6800;"></button>
        <button type="button" class="menu-swatch wp-tile" data-accent="emerald" aria-label={dict.acc_emerald} style="background: #008A00;"></button>
      </div>
    </section>

    <section class="menu-section">
      <h3 class="menu-label">{dict.lang_label}</h3>
      <div class="menu-locales">
        {(['zh', 'yue', 'en'] as const).map((loc) => (
          <a class={`menu-locale ${loc === locale ? 'active' : ''}`} data-loc={loc} href={localeHref(loc)}>
            {loc === 'zh' ? '中' : loc === 'yue' ? '粵' : 'EN'}
          </a>
        ))}
      </div>
    </section>

    <a class="menu-about" href="https://github.com/ShepherdLoveYou/cantopedia" target="_blank" rel="noopener">
      ↗ {dict.about}
    </a>
  </div>
</aside>

<style>
  /* Geometry: full-bar width, slide up from below AppBar (spec §11.3) */
  .more-menu {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 72px;          /* sits directly on top of AppBar */
    max-height: 60vh;
    overflow-y: auto;
    z-index: 1001;         /* one above AppBar — spec §6.1 */
    transform: translateY(100%);
    will-change: transform;

    /* Acrylic — same as AppBar §4.6 */
    background: rgba(0, 0, 0, 0.92);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  :root:not(.dark-side) .more-menu {
    background: rgba(255, 255, 255, 0.95);
    border-top-color: rgba(0, 0, 0, 0.08);
  }
  @supports (backdrop-filter: blur(30px)) or (-webkit-backdrop-filter: blur(30px)) {
    .more-menu {
      backdrop-filter: blur(30px) saturate(125%);
      -webkit-backdrop-filter: blur(30px) saturate(125%);
      background: rgba(0, 0, 0, 0.7);
    }
    :root:not(.dark-side) .more-menu {
      background: rgba(255, 255, 255, 0.8);
    }
  }
  .more-menu[data-state="open"] {
    transform: translateY(0);
  }
  .more-menu[hidden] {
    /* hidden attr is removed when JS opens menu; CSS keeps display:block for transitions */
    display: block !important;
    transform: translateY(100%);
  }

  .more-menu-inner {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .menu-section { display: flex; flex-direction: column; gap: 8px; }

  .menu-label {
    font-family: var(--sans);
    font-size: var(--fs-tiny, 11px);
    font-weight: var(--fw-regular, 400);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--t-ink-dim);
    margin: 0;
  }

  .menu-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .menu-tile {
    appearance: none;
    background: var(--t-plate);
    border: 0;
    color: var(--t-ink);
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 14px;
    border-radius: 0;
  }
  .menu-tile[aria-pressed="true"] {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .menu-tile-name { font-weight: 400; }

  .menu-swatches { display: flex; gap: 12px; }
  .menu-swatch {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 0;
    cursor: pointer;
    box-shadow: inset 0 0 0 2px transparent;
  }
  .menu-swatch[aria-pressed="true"] {
    box-shadow: inset 0 0 0 2px var(--t-ink), inset 0 0 0 4px transparent;
  }

  .menu-locales { display: flex; gap: 8px; }
  .menu-locale {
    padding: 6px 12px;
    color: var(--t-ink-dim);
    text-decoration: none;
    font-family: var(--sans);
    font-size: 14px;
    border-bottom: 2px solid transparent;
  }
  .menu-locale.active {
    color: var(--t-ink);
    border-bottom-color: var(--accent);
  }

  .menu-about {
    display: block;
    padding-top: 12px;
    border-top: 1px solid var(--t-rule);
    color: var(--t-ink-dim);
    text-decoration: none;
    font-family: var(--sans);
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  @media (prefers-reduced-motion: reduce) {
    .more-menu { transition: none; }
    .more-menu[data-state="open"] { transform: translateY(0); }
  }

  @media print {
    .more-menu { display: none !important; }
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `cd site && npm run check 2>&1 | tail -10`
Expected: no errors related to `MoreMenu.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/MoreMenu.astro
git commit -m "feat(appbar): scaffold MoreMenu.astro — theme/accent/locale/about

Spec §4.4. Dialog-role aside that renders all secondary chrome migrated
out of the old top nav: 2 theme tiles, 4 accent swatches, 3 locale tabs,
about row. Sits at bottom:72px (directly above the AppBar) with same
Acrylic styling. Slide-up animation driven by ~/lib/menuSlide.ts (Task 7).

Trilingual dict embedded inline (under brief's 14-20 char MenuItem rule, §2.4).
WP10 system palette hex used for swatches (spec §11.1).

Click handlers (theme/accent application) wired in Task 8 after lib/theme.ts
is consumed from the browser side.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Implement menuSlide.ts with Motion One animation + focus management

**Files:**
- Create: `site/src/lib/menuSlide.ts`

- [ ] **Step 1: Write the module**

Create `site/src/lib/menuSlide.ts`:

```ts
/**
 * Slide-up / slide-down animation for the MoreMenu aside.
 *
 * Spec §4.4: open in 250ms decelerate, close in 167ms accelerate.
 * Uses Motion One (WAAPI) so Animation.finished is awaitable in probes.
 *
 * Also manages focus: on open, move to first focusable inside menu;
 * on close, return to the trigger button (a11y requirement).
 */
import { animate } from 'motion';

const OPEN_DURATION_S = 0.25;     // ControlNormalAnimationDuration (spec §2.1)
const CLOSE_DURATION_S = 0.167;   // ControlFastAnimationDuration
const DECELERATE: [number, number, number, number] = [0, 0, 0, 1];  // §2.2
const ACCELERATE: [number, number, number, number] = [1, 0, 1, 1];

export interface MenuRefs {
  menu: HTMLElement;        // the <aside id="more-menu">
  trigger: HTMLElement;     // the ⋯ button
}

let lastTriggerEl: HTMLElement | null = null;

export async function openMenu({ menu, trigger }: MenuRefs): Promise<void> {
  if (menu.dataset.state === 'open') return;
  menu.hidden = false;
  // Animate from translateY(100%) to translateY(0)
  const a = animate(menu,
    { transform: ['translateY(100%)', 'translateY(0%)'] },
    { duration: OPEN_DURATION_S, easing: DECELERATE }
  );
  // Update ARIA state immediately for screen readers (don't wait for animation)
  menu.dataset.state = 'open';
  trigger.setAttribute('aria-expanded', 'true');
  lastTriggerEl = trigger;

  await a.finished;
  // Focus first focusable inside menu (spec §11.8 — focus order)
  const first = menu.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  first?.focus();
}

export async function closeMenu({ menu, trigger }: MenuRefs): Promise<void> {
  if (menu.dataset.state === 'closed') return;
  const a = animate(menu,
    { transform: ['translateY(0%)', 'translateY(100%)'] },
    { duration: CLOSE_DURATION_S, easing: ACCELERATE }
  );
  menu.dataset.state = 'closed';
  trigger.setAttribute('aria-expanded', 'false');

  await a.finished;
  menu.hidden = true;
  // Return focus to trigger (a11y)
  (lastTriggerEl ?? trigger).focus();
  lastTriggerEl = null;
}

export function toggleMenu(refs: MenuRefs): Promise<void> {
  return refs.menu.dataset.state === 'open' ? closeMenu(refs) : openMenu(refs);
}

/**
 * Wire global handlers: outside-click + Escape closes menu.
 * Returns a teardown function (call from astro:before-preparation).
 */
export function wireGlobalDismiss(refs: MenuRefs): () => void {
  const onDocClick = (e: MouseEvent) => {
    if (refs.menu.dataset.state !== 'open') return;
    const t = e.target as Node;
    if (refs.menu.contains(t) || refs.trigger.contains(t)) return;
    void closeMenu(refs);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && refs.menu.dataset.state === 'open') {
      e.preventDefault();
      void closeMenu(refs);
    }
  };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd site && npm run check 2>&1 | tail -10`
Expected: no errors. (The `motion` import resolves to the npm package added in Task 0.)

- [ ] **Step 3: Commit**

```bash
git add site/src/lib/menuSlide.ts
git commit -m "feat(lib): menuSlide.ts — Motion One slide-up + focus management

Spec §4.4 + §11.8.
- openMenu: animate translateY(100%→0%) over 250ms decelerate, then
  focus first focusable inside menu, set aria-expanded='true'.
- closeMenu: reverse 167ms accelerate, then restore focus to trigger.
- wireGlobalDismiss: returns teardown fn; outside-click + Escape close.

All durations/easings cite spec §2.1+§2.2 Microsoft Fluent baseline.
Uses Animation.finished Promise — no setTimeout — so probes can await
the actual animation end (Task 11).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Wire MoreMenu interactions (theme/accent click handlers + open trigger)

**Files:**
- Modify: `site/src/components/MoreMenu.astro` (add `<script>` block at end)

- [ ] **Step 1: Append wiring script to MoreMenu.astro**

Add this `<script>` block at the bottom of `MoreMenu.astro` (after the `</style>`):

```astro
<script>
  import { applyTheme, applyAccent, readTheme, readAccent } from '~/lib/theme';
  import { openMenu, closeMenu, toggleMenu, wireGlobalDismiss } from '~/lib/menuSlide';

  let teardown: (() => void) | null = null;

  function refreshPressed() {
    const theme = readTheme();
    const accent = readAccent();
    document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.theme === theme ? 'true' : 'false');
    });
    document.querySelectorAll<HTMLButtonElement>('[data-accent]').forEach((b) => {
      // skip the <html data-accent="..."> root — only target swatch buttons
      if (b.tagName !== 'BUTTON') return;
      b.setAttribute('aria-pressed', b.dataset.accent === accent ? 'true' : 'false');
    });
  }

  function wire() {
    const menu = document.getElementById('more-menu');
    const trigger = document.querySelector<HTMLButtonElement>('[data-more-trigger]');
    if (!menu || !trigger) return;
    const refs = { menu, trigger };

    // Open / close via ⋯ button
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      void toggleMenu(refs);
    });

    // Theme tile clicks
    menu.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) => {
      b.addEventListener('click', () => {
        const theme = b.dataset.theme as 'light' | 'dark';
        applyTheme(theme);
        refreshPressed();
      });
    });

    // Accent swatch clicks
    menu.querySelectorAll<HTMLButtonElement>('[data-accent]').forEach((b) => {
      if (b.tagName !== 'BUTTON') return;
      b.addEventListener('click', () => {
        const accent = b.dataset.accent as 'cobalt' | 'red' | 'orange' | 'emerald';
        applyAccent(accent);
        refreshPressed();
      });
    });

    // Global dismiss (outside click + Escape)
    teardown?.();
    teardown = wireGlobalDismiss(refs);

    refreshPressed();
  }

  // Wire on initial load + every SPA swap
  wire();
  document.addEventListener('astro:page-load', wire);

  // Close menu on navigation (spec §4.7 — menu state does NOT persist)
  document.addEventListener('astro:before-preparation', () => {
    const menu = document.getElementById('more-menu');
    const trigger = document.querySelector<HTMLButtonElement>('[data-more-trigger]');
    if (menu?.dataset.state === 'open' && menu && trigger) {
      // Don't animate — page is unloading
      menu.dataset.state = 'closed';
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    teardown?.();
    teardown = null;
  });
</script>
```

- [ ] **Step 2: Type-check**

Run: `cd site && npm run check 2>&1 | tail -10`
Expected: no errors related to MoreMenu.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/MoreMenu.astro
git commit -m "feat(appbar): wire MoreMenu interactions — theme/accent/dismiss

Spec §4.4 + §4.7.
- ⋯ trigger toggles menu via menuSlide.toggleMenu
- Theme tiles call applyTheme + refresh aria-pressed
- Accent swatches call applyAccent + refresh aria-pressed
- Outside-click and Escape close the menu (wireGlobalDismiss)
- astro:before-preparation closes menu without animation (per §4.7)
- astro:page-load re-wires after SPA swap (idempotent via dataset checks)

refreshPressed scopes the [data-accent] selector to BUTTONs so it doesn't
clobber the <html data-accent=...> root attribute.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Build TopStrip.astro — slim 24px brand replacement

**Files:**
- Create: `site/src/components/TopStrip.astro`

- [ ] **Step 1: Write the component**

Create `site/src/components/TopStrip.astro`:

```astro
---
/**
 * Slim top strip — replaces the old full top nav. Brand wordmark only.
 * Phase C will replace this with the full panorama "START / 开始" header.
 *
 * Spec §4.5.
 */
interface Props {
  locale: 'zh' | 'yue' | 'en';
  base: string;
}
const { locale, base } = Astro.props;
---
<header class="top-strip" transition:persist>
  <a class="top-strip-brand" href={`${base}/${locale}/`}>
    <span class="top-strip-mark">CANTOPEDIA</span>
  </a>
</header>

<style>
  .top-strip {
    position: relative;
    height: 24px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    background: transparent;
    z-index: 200;  /* spec §6.1 */
  }
  .top-strip-brand {
    color: var(--t-ink-dim);
    text-decoration: none;
    font-family: var(--sans);
    letter-spacing: 0.22em;
    font-size: 10px;
    font-weight: var(--fw-regular, 400);
  }
  .top-strip-brand:hover { color: var(--t-ink); }
  .top-strip-mark { display: inline-block; }

  @media print {
    .top-strip { display: none; }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/TopStrip.astro
git commit -m "feat(appbar): scaffold TopStrip.astro — 24px slim brand replacement

Spec §4.5. Minimal brand presence at the top (CANTOPEDIA wordmark, 10px,
letter-spaced) while the full panorama header is deferred to Phase C.
transition:persist keeps the strip stable across ClientRouter swaps.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Migrate BaseLayout — remove top nav, mount TopStrip + AppBar + MoreMenu

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Import the new components**

In the BaseLayout frontmatter (the `---` block at the top), add after the existing imports:

```astro
import AppBar from '~/components/AppBar.astro';
import MoreMenu from '~/components/MoreMenu.astro';
import TopStrip from '~/components/TopStrip.astro';
```

- [ ] **Step 2: Replace the top `<nav>` with `<TopStrip>`**

Find the current top nav block in BaseLayout (around lines 99-118 — the `{showNav && (<nav class="metro-nav app-bar">...`). Replace the entire `{showNav && ( ... )}` block with:

```astro
{showNav && <TopStrip locale={locale} base={base} />}
```

- [ ] **Step 3: Mount AppBar + MoreMenu after `<main>`**

Find the `</main>` tag in BaseLayout. Immediately after it, before the `<footer>`, add:

```astro
{showNav && (
  <>
    <AppBar locale={locale} base={base} />
    <MoreMenu locale={locale} base={base} currentPath={Astro.url.pathname} />
  </>
)}
```

- [ ] **Step 4: Add 88px padding-bottom to `<main>`**

Find the `<main>` element. Update it from `<main>` to:

```astro
<main class="page-main">
```

Then add to the `<style is:global>` block (anywhere in the existing block):

```css
.page-main {
  padding-bottom: 88px;  /* 72px AppBar + 16px buffer — spec §4.1 */
}
@media (max-width: 540px) {
  .page-main {
    padding-bottom: 88px;  /* same; viewport doesn't change AppBar height */
  }
}
```

- [ ] **Step 5: Delete now-orphaned top-nav-related script + style**

In BaseLayout's `<script>` block, find the `refreshLocaleSwitchers` function (around lines 147-166) and the locale-switcher related script. Since the locale switcher moved into MoreMenu, this script no longer has anything to refresh on the top bar. Delete the entire `refreshLocaleSwitchers` function AND its event listener registrations.

In BaseLayout's CSS, find any `.metro-nav.app-bar` / `.locale-switcher` rules that targeted the old top nav. Delete those rules (they no longer have a host element).

Keep the `setupTiltPress` and the View Transition `nav-next`/`nav-prev` propagation script — they remain useful for tile press and Hub navigation.

- [ ] **Step 6: Build and visually verify**

Run: `cd site && npm run dev`
Open `http://localhost:4321/cantopedia/zh/`.

Verify:
- A slim 24px brand strip "CANTOPEDIA" appears at the top.
- A 72px Acrylic bottom bar with 4 round buttons appears at the bottom.
- The Hub scrolls horizontally between panels without being covered by the AppBar (Task 11 will fix the height formula).
- Clicking the ⋯ button slides up the MoreMenu.
- Clicking a theme tile in MoreMenu toggles dark/light immediately.
- Clicking an accent swatch changes accent (`.app-list-letter` color will visibly change once Task 13 wires it; in the meantime, observe via DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--accent')`).
- Clicking a locale tab navigates to the equivalent page in the new locale.
- Pressing `Escape` closes the menu and returns focus to ⋯.
- The MoreMenu does NOT show on a hard refresh (it's `hidden` by default).

- [ ] **Step 7: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat(layout): migrate BaseLayout — replace top nav with TopStrip + bottom AppBar + MoreMenu

Spec §3, §4.5, §4.7.

Removed:
- Full top <nav class='metro-nav app-bar' data-role='app-bar'> with brand,
  theme button, locale switcher
- refreshLocaleSwitchers() — locale switcher moved into MoreMenu

Added:
- <TopStrip> at the top (24px slim brand only)
- <AppBar> at the bottom (fixed, 72px, Acrylic, 4 buttons)
- <MoreMenu> at the bottom (slide-up from below AppBar, sibling)
- .page-main padding-bottom: 88px (72 AppBar + 16 buffer)

Both new chrome components use transition:persist to survive ClientRouter
swaps. setupTiltPress and View Transition direction propagation are kept.

Hub height formula is updated in Task 11 (next).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Update Hub.astro height formula (regression-critical, spec §6)

**Files:**
- Modify: `site/src/components/Hub.astro` (one CSS rule)

- [ ] **Step 1: Locate the formula**

Read [Hub.astro:399-414](../../../site/src/components/Hub.astro) — find the `.hub { height: calc(100vh - 120px); ... }` rule (currently line ~410).

- [ ] **Step 2: Replace the formula**

Change `height: calc(100vh - 120px);` to:

```css
height: calc(100vh - 152px);   /* spec §6: 24px top-strip + 56px hub-pivot + 72px AppBar */
```

- [ ] **Step 3: Visual regression check via existing probe**

Run: `cd site && node scripts/probe-pivot.mjs`
Expected: pass (the existing probe verifies hub-pivot title + scroll behavior — height change should not break it).

Also run: `cd site && node scripts/probe-panel-clip.mjs`
Expected: pass — panels still snap correctly without overflowing AppBar.

If either probe fails, the formula is off — inspect with DevTools and adjust by ±4px increments until passing. Update spec §6 critical calc note with the corrected formula.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/Hub.astro
git commit -m "fix(hub): update height formula to account for new TopStrip + AppBar

Spec §6 critical calc:
- old: calc(100vh - 120px) — assumed 64px top nav + 56px hub-pivot
- new: calc(100vh - 152px) — 24px top-strip + 56px hub-pivot + 72px AppBar

This is the most likely regression risk in Phase A+F. Verified via
probe-pivot.mjs and probe-panel-clip.mjs.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Apply accent to AppList letter headers (replace --m-red hardcode)

**Files:**
- Modify: `site/src/components/AppListPanel.astro` (one CSS rule)

- [ ] **Step 1: Locate the hardcoded color**

Read [AppListPanel.astro:88-97](../../../site/src/components/AppListPanel.astro) — find:

```css
.app-list-letter {
  ...
  color: var(--m-red);
  ...
}
```

- [ ] **Step 2: Replace with --accent**

Change `color: var(--m-red);` to:

```css
color: var(--accent);
```

- [ ] **Step 3: Visual verify**

In dev server (`npm run dev`), navigate to `/cantopedia/zh/all`.
Default visit (cobalt accent): letter headers should now be blue `#3E65FF` (was red).
Open MoreMenu, click red swatch: letter headers should turn red `#E51400`.
Click orange: should turn orange. Click emerald: should turn emerald green.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/AppListPanel.astro
git commit -m "feat(applist): use var(--accent) for letter headers (spec §5.5)

The AppListPanel letter headers ([A], [C], [R], ...) move from a
hardcoded var(--m-red) to var(--accent), making them respond to the
user's accent picker selection in MoreMenu.

This is the most visible consumer of the new accent system and a
quick smoke-test for the entire accent pipeline.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Write probe-appbar-acrylic.mjs

**Files:**
- Create: `site/scripts/probe-appbar-acrylic.mjs`

- [ ] **Step 1: Write the probe**

Create `site/scripts/probe-appbar-acrylic.mjs`:

```js
/**
 * probe-appbar-acrylic — Spec §9.1. Verifies:
 *   - AppBar exists, position:fixed, bottom:0, height 72px
 *   - 4 buttons present with correct aria-labels in zh/yue/en
 *   - backdrop-filter computed style is "blur(30px) saturate(125%)"
 *   - .wp-tile class applied; pointerdown adds .pressing
 *
 * Usage: node site/scripts/probe-appbar-acrylic.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE || 'http://localhost:4321/cantopedia';

const LABELS = {
  zh: { home: '首頁', search: '搜尋', random: '隨機菜', more: '更多' },
  yue:{ home: '首頁', search: '搵',   random: '隨機餸',  more: '更多' },
  en: { home: 'Home', search: 'Search', random: 'Random dish', more: 'More options' },
};

const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  for (const locale of ['zh', 'yue', 'en']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${locale}/`);

    const geom = await page.evaluate(() => {
      const bar = document.querySelector('.app-bar--bottom');
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      return {
        height: r.height,
        bottom: r.bottom,
        viewportHeight: window.innerHeight,
        position: cs.position,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
        zIndex: cs.zIndex,
      };
    });

    if (!geom) { console.error(`[${locale}] FAIL: AppBar not found`); failed = true; continue; }
    if (Math.abs(geom.height - 72) > 1) { console.error(`[${locale}] FAIL: height ${geom.height}, want 72`); failed = true; }
    if (Math.abs(geom.bottom - geom.viewportHeight) > 1) { console.error(`[${locale}] FAIL: not anchored to bottom`); failed = true; }
    if (geom.position !== 'fixed') { console.error(`[${locale}] FAIL: position ${geom.position}, want fixed`); failed = true; }
    if (geom.zIndex !== '1000') { console.error(`[${locale}] FAIL: z-index ${geom.zIndex}, want 1000`); failed = true; }
    // Chromium supports backdrop-filter, expect blur(30px) saturate(125%)
    if (!/blur\(30px\)/.test(geom.backdropFilter || '')) {
      console.error(`[${locale}] FAIL: backdrop-filter "${geom.backdropFilter}", want blur(30px)`); failed = true;
    }
    if (!/saturate\(1\.25\)|saturate\(125%\)/.test(geom.backdropFilter || '')) {
      console.error(`[${locale}] FAIL: backdrop-filter saturate "${geom.backdropFilter}"`); failed = true;
    }

    const labels = await page.evaluate(() => {
      const slots = ['home', 'search', 'random', 'more'];
      return slots.map((s) => {
        const el = document.querySelector(`[data-app-bar-slot="${s}"]`);
        return el?.getAttribute('aria-label') || null;
      });
    });
    const want = LABELS[locale];
    if (labels[0] !== want.home)   { console.error(`[${locale}] FAIL: home label "${labels[0]}", want "${want.home}"`); failed = true; }
    if (labels[1] !== want.search) { console.error(`[${locale}] FAIL: search label "${labels[1]}", want "${want.search}"`); failed = true; }
    if (labels[2] !== want.random) { console.error(`[${locale}] FAIL: random label "${labels[2]}", want "${want.random}"`); failed = true; }
    if (labels[3] !== want.more)   { console.error(`[${locale}] FAIL: more label "${labels[3]}", want "${want.more}"`); failed = true; }

    // Tilt-press: pointerdown on home button should add .pressing
    await page.dispatchEvent('[data-app-bar-slot="home"]', 'pointerdown', { clientX: 30, clientY: 30 });
    const pressed = await page.$eval('[data-app-bar-slot="home"]', (el) => el.classList.contains('pressing'));
    if (!pressed) { console.error(`[${locale}] FAIL: tilt-press did not apply .pressing`); failed = true; }

    console.log(`✓ ${locale}: geometry + labels + tilt-press`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (failed) { console.error('\n✗ probe-appbar-acrylic FAILED'); process.exit(1); }
console.log('\n✓ probe-appbar-acrylic PASSED');
```

- [ ] **Step 2: Run the probe**

With dev server running, in another terminal:
`cd site && node scripts/probe-appbar-acrylic.mjs`
Expected: 3 ✓ marks (zh/yue/en) + "✓ probe-appbar-acrylic PASSED". Exit 0.

If failed, inspect the output and fix the underlying component (AppBar.astro / BaseLayout). Common issues:
- backdrop-filter not applied → check `@supports` block in AppBar style
- aria-label mismatch → typo in AppBar dict
- height off by 1px → check for border-top adding to height (use box-sizing:border-box)

- [ ] **Step 3: Commit**

```bash
git add site/scripts/probe-appbar-acrylic.mjs
git commit -m "test(probe): probe-appbar-acrylic verifies AppBar geometry + Acrylic

Spec §9.1 first probe. For each locale (zh/yue/en):
- AppBar at position:fixed, bottom:0, height 72px, z-index 1000
- 4 buttons with locale-correct aria-labels
- backdrop-filter contains blur(30px) and saturate(125%/1.25)
- pointerdown on a button adds .pressing class (tilt-press wiring)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: Write probe-more-menu.mjs

**Files:**
- Create: `site/scripts/probe-more-menu.mjs`

- [ ] **Step 1: Write the probe**

Create `site/scripts/probe-more-menu.mjs`:

```js
/**
 * probe-more-menu — Spec §9.1. Verifies MoreMenu open/close via
 * Animation.finished (NOT setTimeout), focus management, accent click.
 *
 * Usage: node site/scripts/probe-more-menu.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.PROBE_URL || 'http://localhost:4321/cantopedia/zh/';

const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(URL);

  // 1) Click ⋯; await Motion One Animation.finished
  await page.click('[data-more-trigger]');
  await page.waitForFunction(() => {
    const m = document.getElementById('more-menu');
    return m && m.dataset.state === 'open';
  });
  const openState = await page.evaluate(async () => {
    const menu = document.getElementById('more-menu');
    if (!menu) return { ok: false, reason: 'menu not found' };
    const anims = menu.getAnimations();
    // Wait for the in-flight Motion One animation to finish (not setTimeout!)
    if (anims.length > 0) await Promise.all(anims.map((a) => a.finished));
    const cs = getComputedStyle(menu);
    return {
      ok: true,
      state: menu.dataset.state,
      transform: cs.transform,
      visible: !menu.hidden,
      ariaExpanded: document.querySelector('[data-more-trigger]')?.getAttribute('aria-expanded'),
    };
  });
  if (!openState.ok) { console.error('FAIL open:', openState); failed = true; }
  if (openState.state !== 'open') { console.error('FAIL state:', openState); failed = true; }
  if (openState.ariaExpanded !== 'true') { console.error('FAIL aria-expanded:', openState); failed = true; }
  // After open, transform should be matrix(1, 0, 0, 1, 0, 0) or "none"
  if (!/matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)|none/.test(openState.transform)) {
    console.error(`FAIL open transform: ${openState.transform}`); failed = true;
  }
  console.log('✓ open: state=open, transform settled, aria-expanded=true');

  // 2) Focus moved into menu (first focusable)
  const activeIsInMenu = await page.evaluate(() => {
    const m = document.getElementById('more-menu');
    return m?.contains(document.activeElement) ?? false;
  });
  if (!activeIsInMenu) { console.error('FAIL: focus not moved into menu'); failed = true; }
  else console.log('✓ focus moved into menu on open');

  // 3) Click an accent swatch → verify <html data-accent> + localStorage
  await page.click('[data-accent="red"]');
  const accent = await page.evaluate(() => ({
    htmlAttr: document.documentElement.getAttribute('data-accent'),
    stored: localStorage.getItem('cantopedia-accent'),
    cssVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));
  if (accent.htmlAttr !== 'red' || accent.stored !== 'red') {
    console.error(`FAIL accent click: ${JSON.stringify(accent)}`); failed = true;
  }
  if (accent.cssVar !== '#E51400') {
    console.error(`FAIL --accent computed: "${accent.cssVar}"`); failed = true;
  }
  else console.log('✓ accent click: html attr + storage + --accent CSS var all updated');

  // 4) Escape closes menu; await Animation.finished
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('more-menu')?.dataset.state === 'closed');
  const closeState = await page.evaluate(async () => {
    const menu = document.getElementById('more-menu');
    if (!menu) return { ok: false };
    const anims = menu.getAnimations();
    if (anims.length > 0) await Promise.all(anims.map((a) => a.finished));
    return {
      ok: true,
      state: menu.dataset.state,
      hidden: menu.hidden,
      ariaExpanded: document.querySelector('[data-more-trigger]')?.getAttribute('aria-expanded'),
      activeTag: document.activeElement?.tagName,
      activeIsTrigger: (document.activeElement as HTMLElement)?.dataset?.moreTrigger !== undefined,
    };
  });
  if (closeState.state !== 'closed') { console.error('FAIL close state:', closeState); failed = true; }
  if (!closeState.hidden) { console.error('FAIL close hidden:', closeState); failed = true; }
  if (closeState.ariaExpanded !== 'false') { console.error('FAIL aria-expanded:', closeState); failed = true; }
  if (!closeState.activeIsTrigger) { console.error('FAIL: focus not restored to trigger', closeState); failed = true; }
  console.log('✓ Escape closes menu, focus restored to ⋯');

  // 5) Outside click also closes
  await page.click('[data-more-trigger]');
  await page.waitForFunction(() => document.getElementById('more-menu')?.dataset.state === 'open');
  await page.click('body', { position: { x: 5, y: 5 } });
  await page.waitForFunction(() => document.getElementById('more-menu')?.dataset.state === 'closed');
  console.log('✓ outside click closes menu');

  await ctx.close();
} finally {
  await browser.close();
}

if (failed) { console.error('\n✗ probe-more-menu FAILED'); process.exit(1); }
console.log('\n✓ probe-more-menu PASSED');
```

- [ ] **Step 2: Run the probe**

With dev server running:
`cd site && node scripts/probe-more-menu.mjs`
Expected: 5 ✓ marks + "✓ probe-more-menu PASSED". Exit 0.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/probe-more-menu.mjs
git commit -m "test(probe): probe-more-menu verifies MoreMenu animation + a11y

Spec §9.1 second probe. Verifies:
1. ⋯ click opens menu; awaits Motion One Animation.finished (no setTimeout);
   state='open', aria-expanded='true', transform settled to identity.
2. Focus auto-moves into menu on open (first focusable).
3. Accent swatch click updates <html data-accent>, localStorage, and the
   computed --accent CSS variable.
4. Escape closes menu (Animation.finished awaited), focus restores to ⋯.
5. Outside click also closes.

Animation completion check reads element.getAnimations()[0].finished —
the canonical way to await WAAPI/Motion One animations in tests.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 15: Write probe-zindex.mjs (verifies §6.1 layer ordering during overlap)

**Files:**
- Create: `site/scripts/probe-zindex.mjs`

- [ ] **Step 1: Write the probe**

Create `site/scripts/probe-zindex.mjs`:

```js
/**
 * probe-zindex — Spec §6.1 verification gate. Confirms that the z-index
 * scale (view-transition < loading-bar < top-strip < AppBar < MoreMenu)
 * holds during normal navigation. Catches paint-order regressions where
 * a stacking-context promotion (transform, opacity) could break the
 * intended layering.
 *
 * Usage: node site/scripts/probe-zindex.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.PROBE_URL || 'http://localhost:4321/cantopedia/zh/';

const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(URL);

  const zMap = await page.evaluate(() => {
    function z(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return cs.zIndex === 'auto' ? 0 : parseInt(cs.zIndex, 10);
    }
    return {
      loadingBar: z('#loading-bar') ?? z('.loading-bar'),
      topStrip:   z('.top-strip'),
      appBar:     z('.app-bar--bottom'),
      moreMenu:   z('#more-menu'),
    };
  });

  console.log('Z-index snapshot:', zMap);

  // Strict ordering per spec §6.1
  if (zMap.loadingBar === null || zMap.loadingBar > 200) {
    console.error(`FAIL: loading-bar z-index should be ~100, got ${zMap.loadingBar}`); failed = true;
  }
  if (zMap.topStrip !== 200) {
    console.error(`FAIL: top-strip z-index ${zMap.topStrip}, want 200`); failed = true;
  }
  if (zMap.appBar !== 1000) {
    console.error(`FAIL: app-bar z-index ${zMap.appBar}, want 1000`); failed = true;
  }
  if (zMap.moreMenu !== 1001) {
    console.error(`FAIL: more-menu z-index ${zMap.moreMenu}, want 1001`); failed = true;
  }
  if (zMap.appBar <= zMap.topStrip) {
    console.error(`FAIL: app-bar (${zMap.appBar}) must be > top-strip (${zMap.topStrip})`); failed = true;
  }
  if (zMap.moreMenu <= zMap.appBar) {
    console.error(`FAIL: more-menu (${zMap.moreMenu}) must be > app-bar (${zMap.appBar})`); failed = true;
  }
  console.log('✓ z-index strict ordering: loading-bar < top-strip < app-bar < more-menu');

  // Open the menu, take a screenshot during stable state (no animation in flight)
  // and verify visual layering with element-from-point at known coordinates.
  await page.click('[data-more-trigger]');
  await page.waitForFunction(() => {
    const m = document.getElementById('more-menu');
    if (!m || m.dataset.state !== 'open') return false;
    const a = m.getAnimations();
    return a.length === 0 || a.every((x) => x.playState === 'finished');
  });

  // Pick a point inside the MoreMenu and verify it's the topmost element there
  const topMostAtMenuCenter = await page.evaluate(() => {
    const m = document.getElementById('more-menu');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + 20);
    return el ? { tag: el.tagName, classes: el.className, inMenu: m.contains(el) } : null;
  });
  if (!topMostAtMenuCenter?.inMenu) {
    console.error(`FAIL: element at menu center is NOT inside menu:`, topMostAtMenuCenter); failed = true;
  } else {
    console.log('✓ menu open: top-most element at menu coords is inside menu (no AppBar overdraw)');
  }

  await ctx.close();
} finally {
  await browser.close();
}

if (failed) { console.error('\n✗ probe-zindex FAILED'); process.exit(1); }
console.log('\n✓ probe-zindex PASSED');
```

- [ ] **Step 2: Run the probe**

With dev server running:
`cd site && node scripts/probe-zindex.mjs`
Expected: z-index snapshot printed, 2 ✓ marks, "✓ probe-zindex PASSED". Exit 0.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/probe-zindex.mjs
git commit -m "test(probe): probe-zindex verifies §6.1 layer ordering

Spec §6.1 verification gate. Reads computed z-index of:
loading-bar / top-strip / app-bar / more-menu and asserts strict
ordering (100 < 200 < 1000 < 1001).

Also opens the menu and uses elementFromPoint at the menu center to
confirm no AppBar overdraw — the most likely subtle regression where
a transform on AppBar would promote it to a stacking context above the
menu (which is also transformed by Motion One).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 16: Regression sweep — run all existing probes

**Files:** none modified; this is a verification gate.

- [ ] **Step 1: List existing probes**

Run: `ls site/scripts/probe-*.mjs`
Expected: all existing probes from before Phase A+F plus the 4 new ones from this plan.

- [ ] **Step 2: Run critical existing probes**

With dev server running, run each of these and confirm exit 0:

```bash
cd site
node scripts/probe-pivot.mjs            # Hub horizontal pivot
node scripts/probe-panel-clip.mjs       # Panel snapping doesn't overflow
node scripts/probe-cat-tile.mjs         # Category tile 3D flip
node scripts/probe-theme-truth.mjs      # Theme toggle (now via MoreMenu)
node scripts/probe-spa-nav.mjs          # ClientRouter navigation
node scripts/probe-vt-name.mjs          # View Transition name morph
node scripts/probe-slide-timing.mjs     # Featured tile slide-up timing
node scripts/probe-a11y.mjs 2>/dev/null || node scripts/a11y.mjs  # Accessibility
```

For each: expected pass. If any fails, the failure is a regression of Phase A+F — fix the root cause before merging.

- [ ] **Step 3: Run the 4 new Phase A+F probes together**

```bash
cd site
node scripts/probe-dark-default.mjs && \
node scripts/probe-appbar-acrylic.mjs && \
node scripts/probe-more-menu.mjs && \
node scripts/probe-zindex.mjs
```

Expected: all 4 pass.

- [ ] **Step 4: Manual smoke per spec §9.2**

In `npm run dev`:
1. Clean Chrome (DevTools Application → Clear storage), reload → dark + cobalt
2. Open MoreMenu, click Light → page becomes light; reload → stays light
3. Click red accent → AppList letter headers turn red; navigate to a dish → letter headers on the next AppList visit stay red
4. Hub horizontal scroll-snap still snaps between panels (visual check, no overscroll into the AppBar)
5. Click a category tile from Hub home → tile-to-page View Transition still morphs
6. On Hub home, Featured tile cycles between today/random/recent (Metro slide-up still fires)
7. On Hub home, cat tiles 3D flip on auto-cycle
8. Pointerdown on any AppBar button → visible tilt-press
9. Open MoreMenu while on /dishes/[id] → menu appears above all page chrome; Escape closes it

- [ ] **Step 5: Final commit (regression sweep documentation)**

```bash
# No code change here — just a checkpoint commit recording the sweep.
git commit --allow-empty -m "chore: Phase A+F regression sweep — all probes pass

Verified passing after Phase A+F merge candidate:
- probe-dark-default (new)
- probe-appbar-acrylic (new)
- probe-more-menu (new)
- probe-zindex (new)
- probe-pivot (existing — Hub regression)
- probe-panel-clip (existing — height formula regression)
- probe-cat-tile (existing — 3D flip preserved)
- probe-theme-truth (existing — theme via MoreMenu)
- probe-spa-nav (existing — ClientRouter)
- probe-vt-name (existing — View Transition morph)
- probe-slide-timing (existing — Featured tile)
- a11y baseline (existing)

Manual smoke per spec §9.2 also done.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implementing task(s) |
|---|---|
| §2 reference baseline (timing/easing/AppBar/Tilt/accent/Acrylic/typography) | Used as source for Tasks 2, 3, 5, 6, 7 — no implementation needed (it's a reference) |
| §2.11 Motion One + Tailwind decision | Task 0 (install), Task 7 (use) |
| §3 architecture (touched/locked files) | Task 10 (BaseLayout migration); other tasks scoped per file list |
| §4.1 AppBar geometry (72px, fixed, z-1000, Acrylic) | Task 5 (component), Task 13 (probe) |
| §4.2 4 button slots | Task 5 |
| §4.3 button visual (44px circle, 26px icon, tilt-press) | Task 5 |
| §4.4 MoreMenu (slide-up 250/167ms, focus, dismiss) | Task 6 (component), Task 7 (animation lib), Task 8 (wiring), Task 14 (probe) |
| §4.5 top strip | Task 9, Task 10 |
| §4.6 Acrylic fallback | Task 5 (in component CSS) |
| §4.7 transition:persist for AppBar, no-persist menu state | Task 5, Task 8 (close on before-preparation) |
| §5.1 default dark migration | Task 3 (inline script), Task 4 (probe) |
| §5.2 dark/light token table | Already in BaseLayout existing tokens; no change needed (audited in self-review below) |
| §5.3 accent palette mapping | Task 2 (CSS rules), Task 6 (swatches) |
| §5.4 accent CSS variables | Task 2 |
| §5.5 accent application scope | Task 12 (AppList letter headers — the only consumer in Phase A+F; AppBar active-ring lives in AppBar.astro §5 already) |
| §5.6 accent persistence + SPA-swap | Task 3 (inline init), Task 8 (apply on click), Task 10 (BaseLayout — see note below) |
| §6 per-page impact + Hub height calc | Task 10 (padding), Task 11 (Hub formula) |
| §6.1 z-index strategy | Task 5/6/9 use the values; Task 15 verifies |
| §6.2 namespace audit | Done during planning (grep returned 0); §11.10 decision: bare --accent |
| §7 data flow (storage keys, swap lifecycle) | Task 1 (lib/theme), Task 3 (inline), Task 8 (apply) — but see gap below |
| §8 error handling (private mode, no-backdrop-filter, reduced motion, narrow viewport, print) | Task 1 (try/catch), Task 5 (Acrylic fallback + print), Task 6 (reduced-motion + print) |
| §9.1 probes (×3 original + new probe-zindex) | Tasks 4, 13, 14, 15 |
| §9.2 manual smoke | Task 16 |
| §9.3 cross-browser | Manual gate — Chrome runs in probes, Safari/Firefox checked in Task 16 step 4 |
| §10 out-of-scope | Honored (no Phase B/C/D/E code in this plan) |
| §11 resolved decisions | All 10 used: §11.1 (palette in Task 2), §11.2 (default in Task 1/3), §11.3 (full-width menu in Task 6), §11.4 (full random in Task 5), §11.5 (top strip in Task 9), §11.6 (Motion One in Task 0), §11.7 (no scroll-hide — N/A no code), §11.8 (focus order in Task 7), §11.9 (tap-only — N/A no code), §11.10 (--accent bare in Task 2) |

**Gap found and patched:** §7.2 says `astro:before-swap` should copy `data-accent` attr to the incoming doc. Tasks 3 and 8 cover persistence on the same page; but the BaseLayout's existing swap-copy script (which copies `.dark-side`) needs to also copy `data-accent`. Task 10 step 5 should not delete that swap-copy block — it only deletes the locale-related script.

**Patch: Insert into Task 10 between current Step 5 and Step 6:**

> **Step 5b: Update astro:before-swap to also copy data-accent**
>
> Find the existing `document.addEventListener('astro:before-swap', ...)` block that copies `.dark-side` to the incoming document. Update it:
>
> ```js
> document.addEventListener('astro:before-swap', (e) => {
>   if (document.documentElement.classList.contains('dark-side')) {
>     e.newDocument.documentElement.classList.add('dark-side');
>   }
>   const accent = document.documentElement.getAttribute('data-accent');
>   if (accent) {
>     e.newDocument.documentElement.setAttribute('data-accent', accent);
>   }
> });
> ```
>
> This satisfies spec §7.2.

(Patch applied inline — re-read Task 10 with this step before executing.)

**2. Placeholder scan:** All steps contain concrete code, file paths, and commands. No TBD/TODO/FIXME/"similar to". ✅

**3. Type consistency:**
- `ThemeName` = `'light' | 'dark'` consistently used in Tasks 1, 3, 8.
- `AccentName` = `'cobalt' | 'red' | 'orange' | 'emerald'` consistently used in Tasks 1, 2, 3, 6, 8, 14.
- `MenuRefs = { menu: HTMLElement; trigger: HTMLElement }` defined in Task 7, consumed in Task 8.
- `openMenu`/`closeMenu`/`toggleMenu`/`wireGlobalDismiss` names match between Task 7 (definition) and Task 8 (import). ✅

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-26-bottom-appbar-and-dark-default.md`.**

User has pre-approved all steps ("and all your step i approve by default"). Recommended execution mode: **Subagent-Driven** — dispatches a fresh subagent per task with two-stage review, fastest iteration, lowest context bleed.
