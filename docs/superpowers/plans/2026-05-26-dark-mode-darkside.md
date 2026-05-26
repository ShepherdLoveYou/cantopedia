# Dark Mode via Metro `.dark-side` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken 3-state (light/dark/auto) `data-theme`-driven theme system with a 2-state (light/dark) `.dark-side`-driven system that uses Metro v5's native dark token cascade and hand-written WP10-vernacular toggle UI in two locations (Hub Start Menu utility row + nav app-bar).

**Architecture:** `<html>.dark-side` is the single source of truth. Metro's base-theme.less defines `.dark-side { --body-background, --body-color, --border-color, --default-background-disabled }`. Our `:root` aliases `--t-*` tokens forward to those Metro tokens, so every site `var(--t-*)` consumer auto-follows. Toggle UI is 100% hand-written (no Metro `theme-switcher` plugin — see spec Appendix A for blockers). One delegated click handler + one `astro:before-swap` listener handle interaction and SPA-nav state preservation. Inline blocking `<script data-astro-rerun>` applies `.dark-side` before paint on every load/swap.

**Tech Stack:** Astro 5 (ClientRouter view-transitions), Metro UI v5 (`olton/metroui`), vanilla JS (no framework), CSS custom properties, Playwright (via probe scripts).

**Spec:** [docs/superpowers/specs/2026-05-26-dark-mode-darkside-design.md](../specs/2026-05-26-dark-mode-darkside-design.md)

**Branch base:** `feat/wp10-metroui` (commits a4267cf + e1eae14 are the spec)

---

## Pre-flight

Before starting Task 1, ensure:

1. Dev server is running on port 4321 (handoff §4 — must be foreground, detached mode kills Astro):
   ```bash
   cd "d:/Cantonese Cuisine/site" && pnpm dev
   ```
   Verify with `curl -o NUL -s -w "%{http_code}" http://localhost:4321/cantopedia/zh` → expect 200

2. Working tree is clean of dark-mode-unrelated changes. Existing loose ends to be wrapped after final task:
   - `docs/handoff/2026-05-26-dark-mode-handoff.md` (modified, §8 added)
   - `site/scripts/probe-dish-hero-shot.mjs` (new)
   - `site/probe-dish-hero.png` (new — should be gitignored, see Task 7)

3. Read both inline scripts to verify they're both theme-related (spec risk #7):
   ```bash
   sed -n '50,64p;114,126p' "d:/Cantonese Cuisine/site/src/layouts/BaseLayout.astro"
   ```
   Expected: both blocks are theme-init scripts (one for first load, one for ClientRouter re-run). If either block does something else (analytics, dict inject), do NOT delete that part — extract and preserve.

4. Grep for any consumer of the i18n keys that will be renamed:
   ```bash
   cd "d:/Cantonese Cuisine" && grep -rE "dict\.(light|dark|auto)" site/src --include="*.astro" --include="*.ts"
   ```
   Expected: only Hub.astro:251-258 uses `dict.light` / `dict.dark` / `dict.auto`. If other consumers exist, update Task 6 to include them.

---

## Task 1: Update probes to new spec assertions (red state)

This task makes the existing probes assert the NEW design's expected output. After this task, all three probes will FAIL — that is correct TDD red state. Tasks 2-6 progressively turn them green.

**Files:**
- Modify: `site/scripts/probe-theme-truth.mjs`
- Modify: `site/scripts/probe-theme-tiles.mjs`
- Modify: `site/scripts/probe-theme-visual.mjs`

- [ ] **Step 1: Rewrite probe-theme-truth.mjs**

Replace the entire file with:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await ctx.route('**/*', (r) => {
  const h = { ...r.request().headers(), 'cache-control': 'no-cache, no-store', 'pragma': 'no-cache' };
  r.continue({ headers: h });
});

const dump = async (label) => {
  const d = await p.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      darkSide: html.classList.contains('dark-side'),
      htmlBg: getComputedStyle(html).backgroundColor,
      bodyBg: getComputedStyle(body).backgroundColor,
      mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
      vars: {
        '--t-bg': getComputedStyle(html).getPropertyValue('--t-bg').trim(),
        '--body-background': getComputedStyle(html).getPropertyValue('--body-background').trim(),
        '--t-ink': getComputedStyle(html).getPropertyValue('--t-ink').trim(),
        '--body-color': getComputedStyle(html).getPropertyValue('--body-color').trim(),
      },
      hubTiles: Array.from(document.querySelectorAll('button[data-theme]')).map(b => ({
        theme: b.dataset.theme,
        pressed: b.getAttribute('aria-pressed'),
      })),
      navToggle: !!document.querySelector('[data-theme-toggle]'),
      localStorage: (() => { try { return localStorage.getItem('cantopedia-theme'); } catch { return null; } })(),
    };
  });
  return { label, ...d };
};

await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
const r1 = await dump('home-initial');

const darkTile = await p.$('button[data-theme="dark"]');
if (darkTile) {
  await darkTile.click();
  await p.waitForTimeout(300);
}
const r2 = await dump('home-after-click-dark-tile');

const dishLink = await p.$('a[href*="/dishes/"]');
if (dishLink) {
  await dishLink.click();
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
}
const r3 = await dump('dish-after-dark-nav');

const navBtn = await p.$('[data-theme-toggle]');
const r4 = navBtn ? await (async () => {
  await navBtn.click(); await p.waitForTimeout(300);
  return await dump('dish-after-nav-toggle-click');
})() : { label: 'dish-no-nav-toggle (FAIL: nav toggle missing)' };

await p.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
const r5 = await dump('applist-fresh');

console.log(JSON.stringify([r1, r2, r3, r4, r5], null, 2));
await browser.close();
```

- [ ] **Step 2: Rewrite probe-theme-tiles.mjs**

Read existing file first to preserve structure, then replace assertions:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

await page.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

const dump = async (label) => {
  return await page.evaluate((l) => ({
    label: l,
    darkSide: document.documentElement.classList.contains('dark-side'),
    lightPressed: document.querySelector('button[data-theme="light"]')?.getAttribute('aria-pressed'),
    darkPressed: document.querySelector('button[data-theme="dark"]')?.getAttribute('aria-pressed'),
    autoPresent: !!document.querySelector('button[data-theme="auto"], button[data-theme-choice="auto"]'),
  }), label);
};

const before = await dump('before');

await page.click('button[data-theme="dark"].util-tile');
await page.waitForTimeout(200);
const afterDark = await dump('after-click-dark');

await page.click('button[data-theme="light"].util-tile');
await page.waitForTimeout(200);
const afterLight = await dump('after-click-light');

let ok = true;
if (afterDark.darkSide !== true) { console.error('FAIL: clicking dark tile did not add .dark-side'); ok = false; }
if (afterDark.darkPressed !== 'true') { console.error('FAIL: dark tile aria-pressed not synced'); ok = false; }
if (afterLight.darkSide !== false) { console.error('FAIL: clicking light tile did not remove .dark-side'); ok = false; }
if (afterLight.lightPressed !== 'true') { console.error('FAIL: light tile aria-pressed not synced'); ok = false; }
if (afterDark.autoPresent) { console.error('FAIL: auto button still present (should be removed)'); ok = false; }

console.log(JSON.stringify({ before, afterDark, afterLight, pass: ok }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
```

- [ ] **Step 3: Rewrite probe-theme-visual.mjs**

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const inspect = async (label) => {
  return await page.evaluate((l) => ({
    label: l,
    darkSide: document.documentElement.classList.contains('dark-side'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    ariaPressedLight: document.querySelector('button[data-theme="light"]')?.getAttribute('aria-pressed'),
    ariaPressedDark: document.querySelector('button[data-theme="dark"]')?.getAttribute('aria-pressed'),
    navToggle: !!document.querySelector('[data-theme-toggle]'),
  }), label);
};

const results = [];

await page.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
results.push(await inspect('home-initial'));

await page.click('button[data-theme="dark"]');
await page.waitForTimeout(200);
results.push(await inspect('home-after-click-dark'));

await page.click('button[data-theme="light"]');
await page.waitForTimeout(200);
results.push(await inspect('home-after-click-light'));

await page.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
results.push(await inspect('applist-fresh'));

await page.click('[data-theme-toggle]');
await page.waitForTimeout(200);
results.push(await inspect('applist-after-nav-toggle'));

await page.goto('http://localhost:4321/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2', { waitUntil: 'networkidle' });
results.push(await inspect('dish-after-nav-toggle'));

console.log(JSON.stringify(results, null, 2));
await browser.close();
```

- [ ] **Step 4: Run all 3 probes — confirm they FAIL with the expected errors**

```bash
cd "d:/Cantonese Cuisine/site"
node scripts/probe-theme-truth.mjs
node scripts/probe-theme-tiles.mjs
node scripts/probe-theme-visual.mjs
```

Expected failures (this is the TDD red state):
- `probe-theme-truth.mjs`: `bodyBg` still white in dark state, `darkSide` field shows false even after click (because click handler not rewired yet), `navToggle` is false on all pages
- `probe-theme-tiles.mjs`: exits 1 with multiple FAIL lines about `.dark-side` not added, aria-pressed not synced, auto button still present
- `probe-theme-visual.mjs`: `navToggle` is false (no nav button yet); click on `[data-theme-toggle]` selector will throw

Note in your terminal that these failures are expected. Do not proceed if probes ERROR with crashes (e.g., dev server unreachable). Only proceed if probes FAIL on the assertions.

- [ ] **Step 5: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/scripts/probe-theme-truth.mjs site/scripts/probe-theme-tiles.mjs site/scripts/probe-theme-visual.mjs
git commit -m "$(cat <<'EOF'
test(probes): assert new dark-mode design (TDD red state)

Rewrite 3 theme probes to assert the .dark-side architecture:
- probe-theme-truth: check html.classList.contains('dark-side') + new
  data-theme button selector + data-theme-toggle nav button presence
- probe-theme-tiles: assert 2-state (no auto), .dark-side class transitions
- probe-theme-visual: trigger toggle via nav button, screenshot 6 page states

All three probes now FAIL (red) against current code. They will turn green
as Tasks 2-6 implement the spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: CSS foundation — `--t-*` aliases + delete old `html[data-theme]` selectors

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

**Files reference (line numbers in pre-Task-2 state):**
- `:root` token block at lines 290-308 (gets new alias block added)
- `html[data-theme="dark"] { ... }` at line 423 (gets DELETED + replaced with `.dark-side { ... }`)
- `html[data-theme="light"] footer { ... }` at line 545 (DELETE)
- `html[data-theme="light"] .metro-nav.app-bar { ... }` at line 582-585 (DELETE)
- `html[data-theme="light"] .metro-nav { ... }` at line 622 (DELETE)

- [ ] **Step 1: Modify the `:root` token block — add alias lines**

Find this block in [site/src/layouts/BaseLayout.astro](../../../site/src/layouts/BaseLayout.astro) around line 290:

```css
        /* Theme tokens (light default) */
        --t-bg: #f5f5f5;
        --t-plate: #ebebeb;
        --t-plate-dark: #cccccc;
        --t-ink: #1d1d1d;
        --t-ink-dim: #555;
        --t-rule: #d8d8d8;
        --t-card: #ffffff;
        --t-nav-bg: rgba(29, 29, 29, 0.72);
        --t-nav-ink: #ffffff;
```

Replace with:

```css
        /* Theme tokens — light defaults. The first 4 forward to Metro tokens
           so toggling .dark-side on <html> flips them automatically. The
           remaining 4 have no Metro equivalent: --t-plate-dark / --t-card /
           --t-ink-dim get explicit .dark-side overrides below; --t-nav-bg
           and --t-nav-ink are brand-fixed (nav always dark, ink always white). */
        --t-bg: var(--body-background);
        --t-ink: var(--body-color);
        --t-rule: var(--border-color);
        --t-plate: var(--default-background-disabled);
        --t-plate-dark: #cccccc;
        --t-card: #ffffff;
        --t-ink-dim: #555;
        --t-nav-bg: rgba(29, 29, 29, 0.72);
        --t-nav-ink: #ffffff;
```

- [ ] **Step 2: Replace `html[data-theme="dark"]` block with `.dark-side` block**

Find this block around line 423:

```css
      html[data-theme="dark"] {
        --t-bg: #0e0e10;
        --t-plate: #1a1a1c;
        --t-plate-dark: #25252a;
        --t-ink: #f0f0f0;
        --t-ink-dim: #9a9a9a;
        --t-rule: #2a2a2c;
        --t-card: #161618;
        --t-nav-bg: rgba(10, 10, 12, 0.78);
        --t-nav-ink: #f0f0f0;
      }
```

Replace with:

```css
      .dark-side {
        /* Only override the 3 tokens that have no Metro equivalent.
           --t-bg / --t-ink / --t-rule / --t-plate auto-flip via the
           aliases in :root above (they read --body-background etc., which
           Metro's base-theme.less .dark-side block already redefines).
           --t-nav-bg / --t-nav-ink are brand-fixed (no override). */
        --t-plate-dark: #25252a;
        --t-card: #161618;
        --t-ink-dim: #9a9a9a;
      }
```

- [ ] **Step 3: Delete 3 `html[data-theme="light"]` selectors**

Around line 545, find and DELETE:
```css
      html[data-theme="light"] footer { background: var(--m-ink); color: rgba(255,255,255,0.7); }
```

Around line 582-585, find and DELETE:
```css
      html[data-theme="light"] .metro-nav.app-bar {
        /* mirrors light-theme .metro-nav rule above — see line ~558 */
        background-color: var(--m-ink);
      }
```

Around line 622, find and DELETE:
```css
      html[data-theme="light"] .metro-nav { background: var(--m-ink) var(--acrylic-noise); background-blend-mode: overlay; }
```

These are redundant — the base `footer { background: var(--m-ink); ... }` and base `.metro-nav { background: #000 ... }` rules already define the brand-fixed dark colors. The `html[data-theme="light"]` overrides were a sledgehammer keeping them dark in light mode, but they're always dark anyway.

- [ ] **Step 4: Verify no `html[data-theme` selector remains in any source file**

```bash
cd "d:/Cantonese Cuisine"
grep -rEn 'html\[data-theme' site/src --include="*.astro" --include="*.css"
```

Expected: no output (exit code 1). If any remain, delete them too.

- [ ] **Step 5: Manual sanity check via DevTools**

With dev server running, open http://localhost:4321/cantopedia/zh in Chrome. Open DevTools console and run:

```js
document.documentElement.classList.add('dark-side');
```

Expected: `<body>` background immediately changes to dark (`rgb(30, 31, 34)` from Metro's `#1e1f22`). All `var(--t-bg)` consumers (Hub panels, dish hero plate, etc.) also flip.

Then:

```js
document.documentElement.classList.remove('dark-side');
```

Expected: everything returns to light. No JS errors in console.

- [ ] **Step 6: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
refactor(theme): alias --t-* tokens to Metro --body-* + adopt .dark-side

Reverse the token chain direction: Metro's base-theme.less is now the
source of dark/light values, our --t-* tokens read from it. Adding
.dark-side to <html> flips Metro's --body-background, --body-color,
--border-color, --default-background-disabled, which auto-propagates
through the aliases.

Replace html[data-theme="dark"] block with a 3-token .dark-side override
(only the tokens with no Metro equivalent: --t-plate-dark, --t-card,
--t-ink-dim). Delete 3 redundant html[data-theme="light"] selectors —
nav/footer are brand-fixed dark via base rules.

No UI yet to toggle .dark-side; manually verified via DevTools that
adding the class flips body bg correctly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Inline FOUC script — read localStorage + apply `.dark-side` before paint

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (replace the 2 inline scripts in `<head>` at pre-Task lines 50-64 and 114-126)

Pre-condition check from Pre-flight Step 3: confirm both blocks are theme-init scripts. If either does something else, preserve that part.

- [ ] **Step 1: Locate the first inline script (around line 50)**

It looks something like:

```html
<script data-astro-rerun>
  (function () {
    try {
      const saved = localStorage.getItem('cantopedia-theme') || 'auto';
      const dark = saved === 'dark' || (saved === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.themeChoice = saved;
    } catch (e) {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.dataset.themeChoice = 'auto';
    }
  })();
</script>
```

Replace with:

```html
<script data-astro-rerun>
  (function () {
    try {
      let saved = localStorage.getItem('cantopedia-theme');
      /* Migration: legacy 'auto' value is treated as 'light' (matches default
         behavior on first ever visit). Write back so Metro/probes see the
         normalized value on next read. */
      if (saved === 'auto') {
        saved = 'light';
        localStorage.setItem('cantopedia-theme', 'light');
      }
      const isDark = saved === 'dark';
      document.documentElement.classList.toggle('dark-side', isDark);
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 2: Locate the second inline script (around line 114)**

Read its current content. If it is also a theme-init script (likely a duplicate or re-run safety net for the same logic), DELETE it entirely — the script above with `data-astro-rerun` already re-runs on every ClientRouter swap.

If it does something else (dictionary inject, analytics, etc.), preserve that functionality. Move any non-theme code into a different `<script>` block and delete only the theme parts.

- [ ] **Step 3: Manual verification — FOUC fix on first load**

In Chrome DevTools, open http://localhost:4321/cantopedia/zh. Console:

```js
localStorage.setItem('cantopedia-theme', 'dark');
```

Then hard-reload (Ctrl+Shift+R or Cmd+Shift+R). Expected: page renders with dark `<body>` from first paint — no white flash visible.

To verify under throttling, open DevTools Performance tab → CPU throttling → 4× slowdown → reload. Confirm still no flash.

Then:

```js
localStorage.removeItem('cantopedia-theme');
```

Reload — should render light.

- [ ] **Step 4: Migration verification**

```js
localStorage.setItem('cantopedia-theme', 'auto');
```

Reload. Expected:
- Page renders light (not dark)
- `localStorage.getItem('cantopedia-theme')` now returns `'light'` (the migration wrote back)

- [ ] **Step 5: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
refactor(theme): inline FOUC script reads localStorage and toggles .dark-side

Replace the two existing inline theme-init scripts in <head> with a single
data-astro-rerun script that:
- reads cantopedia-theme from localStorage
- migrates legacy 'auto' value to 'light' (writes back)
- toggles .dark-side on <html> before paint

Removes the data-theme / data-themeChoice dataset writes (no longer used)
and the prefers-color-scheme media check (auto mode is gone).

The script is blocking (head-positioned, no async/defer), so no paint
happens with the wrong class. data-astro-rerun ensures it re-runs after
every ClientRouter swap.

Verified with DevTools Performance @ 4x CPU throttle — no flash.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Click handler + `astro:before-swap` / `astro:page-load` listeners

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (replace the big theme handler `<script>` block at pre-Task lines 225-265)

- [ ] **Step 1: Locate the existing theme handler script**

It looks something like:

```html
<script>
  (function () {
    function applyChoice(choice) {
      try {
        const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        document.documentElement.dataset.themeChoice = choice;
        // ... aria-pressed sync, localStorage write, etc.
      } catch {}
    }

    function setup() { /* attach click listeners */ }
    setup();
    document.addEventListener('astro:page-load', setup);
  })();
</script>
```

Replace the entire `<script>` block with:

```html
<script>
  (function () {
    function applyTheme(value) {
      const isDark = value === 'dark';
      document.documentElement.classList.toggle('dark-side', isDark);
      try { localStorage.setItem('cantopedia-theme', value); } catch (e) {}
      document.querySelectorAll('button[data-theme]').forEach(b => {
        b.setAttribute('aria-pressed', b.dataset.theme === value ? 'true' : 'false');
      });
    }

    /* Delegated click: handles Hub tiles (data-theme="light"|"dark") and
       nav toggle (data-theme-toggle, which flips current state). */
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const tile = target.closest('button[data-theme]');
      if (tile && (tile.dataset.theme === 'light' || tile.dataset.theme === 'dark')) {
        applyTheme(tile.dataset.theme);
        return;
      }
      const toggle = target.closest('[data-theme-toggle]');
      if (toggle) {
        const next = document.documentElement.classList.contains('dark-side') ? 'light' : 'dark';
        applyTheme(next);
      }
    });

    /* Preserve .dark-side across ClientRouter swap by copying class to
       incoming document before swap completes. Belt-and-suspenders with
       the data-astro-rerun inline script in <head>. */
    document.addEventListener('astro:before-swap', (e) => {
      if (document.documentElement.classList.contains('dark-side')) {
        e.newDocument.documentElement.classList.add('dark-side');
      }
    });

    /* After each SPA nav, sync aria-pressed on freshly rendered Hub tiles
       (Hub is home-only; on other pages this is a no-op). */
    document.addEventListener('astro:page-load', () => {
      const current = document.documentElement.classList.contains('dark-side') ? 'dark' : 'light';
      document.querySelectorAll('button[data-theme]').forEach(b => {
        b.setAttribute('aria-pressed', b.dataset.theme === current ? 'true' : 'false');
      });
    });
  })();
</script>
```

Critical: this `<script>` must NOT have `data-astro-rerun`. The click listener and `astro:before-swap` listener must register exactly once per page lifetime. With `data-astro-rerun`, each swap would re-execute the IIFE and re-register listeners with new closures, leaking listeners.

- [ ] **Step 2: Manual verification — listeners work**

Reload http://localhost:4321/cantopedia/zh. Console:

```js
// Verify click handler registered (no error, just inspect)
typeof document.onclick;  // 'object' or 'function' if assigned; ours is via addEventListener so this is null — instead:
getEventListeners(document).click?.length;  // Chrome DevTools only — should show 1
```

Click anywhere on body that isn't a Hub tile or nav toggle: no theme change (handler returns early).

Then in console:

```js
document.documentElement.classList.add('dark-side');
```

Navigate via Astro link click (don't reload — that's swap path). After landing on new page, verify `document.documentElement.classList.contains('dark-side')` is still `true`.

- [ ] **Step 3: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
feat(theme): delegated click handler + astro:before-swap listener

Replace the per-page setup() pattern with a once-registered delegated
click handler on document. Handles two button shapes:
- Hub tiles: button[data-theme="light"|"dark"] — sets that specific theme
- Nav toggle: [data-theme-toggle] — flips current state

astro:before-swap copies .dark-side to incoming document before swap,
preventing mid-swap white flash even if the inline script's rerun timing
is racy. astro:page-load syncs aria-pressed on Hub tiles after each SPA
nav (Hub re-renders fresh on every home visit).

Script is registered without data-astro-rerun so listeners attach once
per page lifetime, not per swap (avoids leak from data-astro-rerun
re-running the IIFE).

No UI buttons yet — Tasks 5 and 6 add them. Click handler works correctly
when buttons exist (delegation pattern).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Nav theme button — markup + CSS

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Locate the nav block**

Search for the `.metro-nav.app-bar` markup in the `<body>` section (not the `<style>` rules — those are around line 574). The actual `<header>` / `<nav>` markup is further down. Grep:

```bash
cd "d:/Cantonese Cuisine"
grep -n '<header\|<nav\|class="metro-nav\|class={`metro-nav' site/src/layouts/BaseLayout.astro
```

Find the `locale-switcher` element. The theme button goes immediately before it.

- [ ] **Step 2: Insert the nav theme button markup**

Before the `<div class="locale-switcher">` element (or whatever wraps the EN/ZH/YUE links), insert:

```astro
<button type="button" class="metro-nav-theme-btn"
        data-theme-toggle
        aria-label={t.theme_toggle ?? 'Toggle theme'}>
  <span class="mif-sunny" aria-hidden="true"></span>
  <span class="mif-moon-right" aria-hidden="true"></span>
</button>
```

Note: `t.theme_toggle` is the i18n dict accessor — Task 6 will add this key. Until then, the `?? 'Toggle theme'` fallback kicks in. If the i18n object in this file is named differently (e.g., `dict` instead of `t`), use that name.

- [ ] **Step 3: Add the nav theme button CSS**

In the `<style is:global>` block (around line 540-665), add after the existing `.metro-nav.app-bar` rules:

```css
      .metro-nav-theme-btn {
        background: transparent;
        border: 0;
        color: rgba(255, 255, 255, 0.7);
        width: var(--sp-6);
        height: var(--sp-6);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        cursor: pointer;
        padding: 0;
      }
      .metro-nav-theme-btn:hover { color: #fff; }
      .metro-nav-theme-btn .mif-sunny { display: inline-flex; }
      .metro-nav-theme-btn .mif-moon-right { display: none; }
      .dark-side .metro-nav-theme-btn .mif-sunny { display: none; }
      .dark-side .metro-nav-theme-btn .mif-moon-right { display: inline-flex; }
```

The icon shown is the **target state** the button will switch to. Light mode shows ☀ (you can keep light — actually no: target is dark, show moon). Wait — re-read the spec carefully:

Spec says "icon shows the target state the button will switch to". So:
- Light mode → button shows mif-moon-right (clicking will switch to dark)
- Dark mode → button shows mif-sunny (clicking will switch to light)

The CSS above has it inverted. Replace with:

```css
      .metro-nav-theme-btn {
        background: transparent;
        border: 0;
        color: rgba(255, 255, 255, 0.7);
        width: var(--sp-6);
        height: var(--sp-6);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        cursor: pointer;
        padding: 0;
      }
      .metro-nav-theme-btn:hover { color: #fff; }
      .metro-nav-theme-btn .mif-sunny { display: none; }
      .metro-nav-theme-btn .mif-moon-right { display: inline-flex; }
      .dark-side .metro-nav-theme-btn .mif-sunny { display: inline-flex; }
      .dark-side .metro-nav-theme-btn .mif-moon-right { display: none; }
```

This way: light mode shows moon (next state = dark), dark mode shows sun (next state = light). WP10 vernacular: icon = target action.

- [ ] **Step 4: Verify nav layout on mobile viewport (spec risk #8)**

Open Chrome DevTools → device toolbar → set viewport to 320×568 (iPhone SE). Reload home. Check:
- Brand text still centered (or appropriately laid out)
- Locale switcher (EN/ZH/YUE) still visible
- Theme button visible

If the locale switcher is pushed off-screen, add `.metro-nav-theme-btn { display: none; }` for `@media (max-width: 360px)` AND open a follow-up issue. (For this plan, assume normal phone viewport ≥ 360px works.)

- [ ] **Step 5: Run probe-theme-truth.mjs — partial progress check**

```bash
cd "d:/Cantonese Cuisine/site"
node scripts/probe-theme-truth.mjs
```

Expected (partial progress vs. Task 1's red state):
- `navToggle: true` on all 5 page states (PASS for this assertion)
- Clicking nav toggle on dish page now actually flips theme (`r4` shows `darkSide` flipped)
- Hub tile clicks still don't work (Hub still has old `data-theme-choice` not `data-theme` — Task 6)
- `bodyBg` flips correctly when nav toggle clicked (because Task 2 + Task 3 done)

- [ ] **Step 6: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
feat(theme): nav theme toggle button — global access on every page

Insert a hand-written button with data-theme-toggle attribute in
.metro-nav.app-bar right side (before locale-switcher). The button shows
the icon of the TARGET state (mif-moon-right in light mode, mif-sunny in
dark mode), per WP10 vernacular where icons signal action not state.

CSS keeps the button at status-bar size (var(--sp-6) = 40px), transparent
background, dim white default with full white on hover. .dark-side
selector swaps which icon is displayed.

Verified mobile viewport (320x568): brand + locale + theme button all fit.

probe-theme-truth.mjs now reports navToggle: true on all pages; clicking
it flips bodyBg correctly (alias chain + click handler working end-to-end).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hub utility row cleanup + i18n

**Files:**
- Modify: `site/src/components/Hub.astro`
- Modify: `site/src/i18n/zh.yml`
- Modify: `site/src/i18n/yue.yml`
- Modify: `site/src/i18n/en.yml`

- [ ] **Step 1: Verify i18n consumer scope (re-check Pre-flight Step 4)**

```bash
cd "d:/Cantonese Cuisine"
grep -rEn "dict\.(light|dark|auto|theme)|t\.(light|dark|auto|theme)" site/src --include="*.astro" --include="*.ts"
```

Expected: only Hub.astro:251-258 and BaseLayout.astro (the line you added in Task 5 Step 2: `aria-label={t.theme_toggle ...}`) use these keys.

If other consumers exist (e.g., a settings page), update them too in this task.

- [ ] **Step 2: Modify Hub.astro — delete auto tile, rename data attribute**

Locate the 3 buttons at [site/src/components/Hub.astro:251-258](../../../site/src/components/Hub.astro#L251) (current state, pre-Task 6):

```astro
      <button type="button" class="tile-small wp-tile util-tile" data-role="tile" data-size="small" data-theme-choice="light" style="background: var(--m-yellow);" aria-label={dict.light ?? 'Light'}>
        <span class="mif-sunny util-icon"></span>
      </button>
      <button type="button" class="tile-small wp-tile util-tile" data-role="tile" data-size="small" data-theme-choice="dark" style="background: var(--m-purple);" aria-label={dict.dark ?? 'Dark'}>
        <span class="mif-moon-right util-icon"></span>
      </button>
      <button type="button" class="tile-small wp-tile util-tile" data-role="tile" data-size="small" data-theme-choice="auto" style="background: var(--m-steel);" aria-label={dict.auto ?? 'Auto'}>
        <span class="mif-cog util-icon"></span>
      </button>
```

Replace with (delete auto, rename attribute on remaining 2):

```astro
      <button type="button" class="tile-small wp-tile util-tile" data-role="tile" data-size="small" data-theme="light" style="background: var(--m-yellow);" aria-label={dict.theme_light ?? 'Light theme'}>
        <span class="mif-sunny util-icon"></span>
      </button>
      <button type="button" class="tile-small wp-tile util-tile" data-role="tile" data-size="small" data-theme="dark" style="background: var(--m-purple);" aria-label={dict.theme_dark ?? 'Dark theme'}>
        <span class="mif-moon-right util-icon"></span>
      </button>
```

- [ ] **Step 3: Modify i18n YAML files**

For each of [site/src/i18n/zh.yml](../../../site/src/i18n/zh.yml), [site/src/i18n/yue.yml](../../../site/src/i18n/yue.yml), [site/src/i18n/en.yml](../../../site/src/i18n/en.yml):

a. **Find and DELETE the `auto:` key.** Locate (existing key may have value like `自動` / `自動` / `Auto`):
   ```yaml
   auto: 自動
   ```
   Delete the entire line.

b. **Rename `light:` to `theme_light:`** with a slightly more descriptive value:
   - `zh.yml`: `theme_light: 浅色主题`
   - `yue.yml`: `theme_light: 淺色主題`
   - `en.yml`: `theme_light: Light theme`

c. **Rename `dark:` to `theme_dark:`** similarly:
   - `zh.yml`: `theme_dark: 深色主题`
   - `yue.yml`: `theme_dark: 深色主題`
   - `en.yml`: `theme_dark: Dark theme`

d. **Add `theme_toggle:` key** for the nav button aria-label:
   - `zh.yml`: `theme_toggle: 切换主题`
   - `yue.yml`: `theme_toggle: 切換主題`
   - `en.yml`: `theme_toggle: Toggle theme`

YAML gotcha (from memory `feedback-yaml-gotchas`): values starting with `"` need single-quote wrap; `#` is YAML comment. Values above are safe (plain text, no `:` or `#` or leading `"`).

- [ ] **Step 4: Verify no orphan `dict.light` / `dict.dark` / `dict.auto` consumers**

```bash
cd "d:/Cantonese Cuisine"
grep -rEn 'dict\.(light|dark|auto)\b' site/src --include="*.astro" --include="*.ts"
```

Expected: no output. If any remain, update them to `dict.theme_light` / `dict.theme_dark` / delete the auto reference.

- [ ] **Step 5: Run all 3 probes — all should PASS now**

```bash
cd "d:/Cantonese Cuisine/site"
node scripts/probe-theme-truth.mjs
node scripts/probe-theme-tiles.mjs
node scripts/probe-theme-visual.mjs
```

Expected:
- `probe-theme-truth.mjs`: prints JSON; `bodyBg` flips between `rgb(255,255,255)` (light) and `rgb(30,31,34)` (Metro `#1e1f22` dark); `darkSide` field accurate; `hubTiles` shows 2 entries (light + dark) with proper `aria-pressed` sync; `navToggle: true` everywhere; `localStorage` value updates after toggle.
- `probe-theme-tiles.mjs`: exit 0, `pass: true`. No `auto` button present.
- `probe-theme-visual.mjs`: prints JSON for 6 state snapshots, all `darkSide` / `bodyBg` consistent with which toggle was clicked last.

- [ ] **Step 6: Manual visual sanity check**

1. Open http://localhost:4321/cantopedia/zh in Chrome
2. Click Hub dark tile → entire page goes dark, no flash, no jank
3. Navigate to a dish page → still dark, no flash on swap
4. Click nav toggle (top right) → flips to light, no flash
5. Navigate to /all (applist) → still light
6. Click nav toggle → dark
7. Hard-reload → still dark (localStorage persisted)

If any step fails visually but probes pass, file a separate bug — don't block this task.

- [ ] **Step 7: Commit**

```bash
cd "d:/Cantonese Cuisine"
git add site/src/components/Hub.astro site/src/i18n/zh.yml site/src/i18n/yue.yml site/src/i18n/en.yml
git commit -m "$(cat <<'EOF'
feat(theme): Hub 2-tile (light/dark) + i18n rename + auto removal

Delete the auto tile from Hub Start Menu utility row, leaving 2 tiles
(yellow=light, purple=dark) with mif-sunny/mif-moon-right icons. Rename
data-theme-choice to data-theme on the remaining 2 — matches the
delegated click handler in BaseLayout from Task 4.

i18n cleanup: drop 'auto:' key from all 3 locale files (zh, yue, en),
rename 'light:'/'dark:' to 'theme_light:'/'theme_dark:' for clearer
intent, add 'theme_toggle:' for the nav button aria-label.

All 3 theme probes now PASS (TDD green). End-to-end verified manually:
Hub tile clicks + nav toggle clicks both work on home + dish + applist
pages, .dark-side persists across SPA navs, localStorage roundtrips.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wrap-up — handoff cleanup + probe artifacts gitignore

This task closes the brainstorm-session loose ends carried over from Pre-flight Step 2.

**Files:**
- Modify: `docs/handoff/2026-05-26-dark-mode-handoff.md` (already modified, uncommitted)
- Modify: `.gitignore`
- Create / verify: `site/scripts/probe-dish-hero-shot.mjs` (already created, uncommitted)

- [ ] **Step 1: Update handoff doc to reflect completion**

The handoff doc's §8 currently describes the dish-hero dirty change. Add a §9 noting the dark-mode work is done:

Read the current handoff doc and append:

```markdown
---

## 9. Dark mode work — COMPLETE in this session

Spec + plan + implementation all landed:
- Spec: `docs/superpowers/specs/2026-05-26-dark-mode-darkside-design.md` (commits a4267cf + e1eae14)
- Plan: `docs/superpowers/plans/2026-05-26-dark-mode-darkside.md`
- Implementation: 6 commits — see `git log feat/wp10-metroui --oneline`

`probe-theme-truth.mjs` / `probe-theme-tiles.mjs` / `probe-theme-visual.mjs`
all pass. §1-§7 above are historical context for the in-progress state at
session start; §1 (cat-tile flip fixes 5a01f0a + 0fc9c3e) was already
shipped at session start, and §2-§6 (dark-mode brainstorm) are now done.

Next session: pick up `feat/wp10-metroui` and merge to `main` if desired,
or continue with other WP10 polish (e.g., the nav flex squeeze on
sub-360px viewport — spec risk #8 — was deferred).
```

- [ ] **Step 2: Add probe PNG output to .gitignore**

Append to `.gitignore`:

```
# Playwright probe screenshot outputs (transient — not source)
site/probe-*.png
```

- [ ] **Step 3: Stage probe script + verify PNG is now ignored**

```bash
cd "d:/Cantonese Cuisine"
git status --short
```

Expected `??` (untracked) lines:
- `site/scripts/probe-dish-hero-shot.mjs` (should still appear)
- `site/probe-dish-hero.png` (should NOT appear — gitignored now)

If PNG still shown, double-check `.gitignore` was saved with the right path.

- [ ] **Step 4: Commit wrap-up**

```bash
cd "d:/Cantonese Cuisine"
git add docs/handoff/2026-05-26-dark-mode-handoff.md .gitignore site/scripts/probe-dish-hero-shot.mjs
git commit -m "$(cat <<'EOF'
chore: wrap brainstorm-session loose ends

- handoff: mark §9 dark-mode work complete (cross-ref to spec + plan)
- .gitignore: site/probe-*.png — transient Playwright screenshot outputs
- probe-dish-hero-shot.mjs: new probe used to verify the dish-hero
  refactor in commit d51b68f (kept as reusable visual probe)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

After Task 7 commits, run a full sweep:

```bash
cd "d:/Cantonese Cuisine"
git log --oneline feat/wp10-metroui -10
git status                              # expect clean working tree
cd site && pnpm test:run 2>&1 | tail -20   # if a test script exists
node scripts/probe-theme-truth.mjs       # green
node scripts/probe-theme-tiles.mjs       # exit 0
node scripts/probe-theme-visual.mjs      # green
```

Expected git log entries (top of branch):
- Task 7 wrap-up
- Task 6 Hub + i18n
- Task 5 nav button
- Task 4 click handler + listeners
- Task 3 inline FOUC script
- Task 2 CSS foundation
- Task 1 probes (TDD red)
- (then) e1eae14 spec Audit + a4267cf spec rev 2 + earlier commits

7 implementation commits total, in a clean linear sequence.

---

## Self-review

**Spec coverage check:**
- §Architecture Token alias chain → Task 2 (alias block + delete html[data-theme]) ✓
- §Architecture Toggle UI Location A (Hub) → Task 6 (Hub markup change) ✓
- §Architecture Toggle UI Location B (nav) → Task 5 (nav button markup + CSS) ✓
- §Architecture Click handlers → Task 4 (delegated click + listeners) ✓
- §FOUC Scenario 1 (inline script) → Task 3 ✓
- §FOUC Scenario 2 (no transition) → Task 2 ensures no `:root { transition: bg-color }` is added; no explicit task needed (verify in Task 6 manual sanity) ✓
- §FOUC Scenario 3 (astro:before-swap) → Task 4 ✓
- §Cleanup tasks file-by-file → distributed across Tasks 2-6 ✓
- §Probe updates → Task 1 (rewrite) + verified passing in Task 6 ✓
- §Verification strategy → run order embedded in Task 6 Step 5-6 + Final verification ✓
- §Risks #1-#8 → #7 (two inline scripts) addressed in Task 3 Step 2; #8 (nav flex squeeze) addressed in Task 5 Step 4; others are documentation risks, not implementation steps
- §Metro Reuse Audit → no implementation needed; informational ✓
- §Appendix A (why not theme-switcher plugin) → no implementation; informational ✓

**Placeholder scan:** no TBD / TODO / "implement later" / generic "add error handling". All code blocks contain real code. All commands are runnable as-is.

**Type / naming consistency:**
- `data-theme` attribute on Hub buttons: Task 1 probe selector, Task 4 click handler `tile.dataset.theme`, Task 6 markup — consistent
- `data-theme-toggle` attribute on nav button: Task 1 probe selector, Task 4 click handler `[data-theme-toggle]`, Task 5 markup — consistent
- `cantopedia-theme` localStorage key: Task 1 probe read, Task 3 inline script read/write, Task 4 click handler write — consistent
- `applyTheme` function name: only used inside Task 4 IIFE, no cross-task collision
- `.metro-nav-theme-btn` CSS class: Task 5 markup + Task 5 CSS — consistent
- i18n keys `theme_light` / `theme_dark` / `theme_toggle`: Task 5 (uses `t.theme_toggle`), Task 6 (defines + uses `dict.theme_light/dark`) — consistent

All checks pass. Plan is ready for execution.

---

## Execution

Plan complete and saved. The next message will ask the user to choose between subagent-driven execution (recommended) or inline execution.
