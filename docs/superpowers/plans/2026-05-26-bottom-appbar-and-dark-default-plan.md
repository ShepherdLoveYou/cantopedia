# WP10 Mobile Phase A+F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate top horizontal nav to a bottom Acrylic AppBar, flip default theme to dark, and add a 4-color accent picker — all without disturbing the existing Hub / Pivot / Tilt-press / View Transitions chrome.

**Architecture:** Single-layout rewrite. `BaseLayout.astro` loses its top `<nav data-role="app-bar">` and gains: (1) a 24px slim top strip with brand only, (2) a fixed bottom `<nav class="app-bar">` with 4 circular buttons + Acrylic backdrop, (3) a Motion-One-driven slide-up More menu containing theme tiles, accent swatches, locale tabs, and an about row. Theme/accent state extracted to `lib/theme.ts`. Existing `setupTiltPress` global delegation already covers `.wp-tile` — AppBar buttons inherit. Hub height calc updated to compensate for the new chrome.

**Tech Stack:** Astro 5 + Content Collections, `@olton/metroui` v5 (local npm), Motion One v10 (new — ~12KB gzip), TypeScript, Playwright for probes. No Tailwind. CSS variables drive theming.

**Spec**: [docs/superpowers/specs/2026-05-26-bottom-appbar-and-dark-default-design.md](../specs/2026-05-26-bottom-appbar-and-dark-default-design.md)

---

## Pre-flight Notes

**Branch strategy:** This work lives on `main` (the prior `feat/wp10-metroui` branch is already merged). For risk isolation, the subagent driver may create a worktree `feat/wp10-phase-af` via the `using-git-worktrees` skill; if so, the agent operates inside that worktree until final merge. If not, work proceeds directly on `main` with frequent commits.

**Existing token reuse — IMPORTANT:** The repo already defines `--fluent-duration-normal: 280ms`, `--fluent-duration-fast: 180ms`, and `--fluent-curve-decelerate-mid` / `--fluent-curve-accelerate-mid` in `BaseLayout.astro:378-381`. The spec quotes Microsoft's exact 250ms/167ms. **Implementation uses the existing tokens, not the spec's literal milliseconds.** Difference (30/15 ms) is imperceptible; cohesion with the rest of the site beats microsecond accuracy.

**Existing acrylic noise pattern:** `--acrylic-noise` (SVG feTurbulence dataURL) is already defined at `BaseLayout.astro:384`. The new AppBar uses it as an overlay layer on top of `backdrop-filter`, matching Microsoft's full Acrylic recipe (blur + tint + grain).

**Working directory:** `d:/Cantonese Cuisine`. Site lives in `site/`. Run `npm install` and `npm run dev` from `site/`.

**Probe convention:** all new probes start with `probe-` (no underscore prefix — those `_probe-*` files are untracked work-in-progress). New probes go in `site/scripts/probe-<name>.mjs`. Test against `http://localhost:4321/cantopedia/...` after `npm run dev` in `site/`.

---

## Task 1: Install Motion One

**Files:**
- Modify: `site/package.json`

- [ ] **Step 1: Install package**

Run from `d:/Cantonese Cuisine/site`:
```bash
npm install motion@^11
```

Expected: `motion` appears in `dependencies` of `site/package.json`. Lockfile updated.

- [ ] **Step 2: Verify import surface**

Run from `d:/Cantonese Cuisine/site`:
```bash
node -e "import('motion').then(m => console.log(Object.keys(m).filter(k => k === 'animate' || k === 'spring' || k === 'inView')))"
```

Expected output includes `[ 'animate' ]` (the only API this plan uses).

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/package.json site/package-lock.json
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
chore: install motion@^11 for WP10 AppBar slide animation

Per spec §2.11. Used by Phase A+F More menu slide-up/down. ~12KB gzip.
WAAPI-based — same code path as existing View Transitions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract theme + accent module

**Files:**
- Create: `site/src/lib/theme.ts`

- [ ] **Step 1: Create module**

Write `site/src/lib/theme.ts`:
```typescript
/**
 * Centralized theme + accent state for Cantopedia.
 *
 * Read-from / write-to localStorage with keys:
 *   cantopedia-theme  : 'light' | 'dark'
 *   cantopedia-accent : 'cobalt' | 'red' | 'orange' | 'emerald'
 *
 * SSR-safe: all functions guard against missing `window` / `localStorage`.
 * SPA-safe: callable from `astro:page-load` listeners after ClientRouter swap.
 *
 * The applyTheme/applyAccent functions also update aria-pressed on any
 * matching toggle controls — call them after the menu mounts.
 */

export type Theme = 'light' | 'dark';
export type Accent = 'cobalt' | 'red' | 'orange' | 'emerald';

const THEME_KEY = 'cantopedia-theme';
const ACCENT_KEY = 'cantopedia-accent';

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_ACCENT: Accent = 'cobalt';

const ACCENTS: ReadonlyArray<Accent> = ['cobalt', 'red', 'orange', 'emerald'];

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function readTheme(): Theme {
  const v = safeGet(THEME_KEY);
  // Legacy 'auto' migrates to dark (Phase F decision — see spec §5.1).
  if (v === null || v === 'auto') return DEFAULT_THEME;
  return v === 'light' ? 'light' : 'dark';
}

export function readAccent(): Accent {
  const v = safeGet(ACCENT_KEY);
  return (ACCENTS as ReadonlyArray<string>).includes(v ?? '') ? (v as Accent) : DEFAULT_ACCENT;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark-side', theme === 'dark');
  safeSet(THEME_KEY, theme);
  document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.theme === theme ? 'true' : 'false');
  });
}

export function applyAccent(accent: Accent): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', accent);
  safeSet(ACCENT_KEY, accent);
  document.querySelectorAll<HTMLButtonElement>('button[data-accent-swatch]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.accentSwatch === accent ? 'true' : 'false');
  });
}

export function toggleTheme(): Theme {
  const current = document.documentElement.classList.contains('dark-side') ? 'dark' : 'light';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Boot — call from inline head script (no FOIT) and again from astro:page-load. */
export function bootThemeAndAccent(): void {
  applyTheme(readTheme());
  applyAccent(readAccent());
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `d:/Cantonese Cuisine/site`:
```bash
npx tsc --noEmit
```

Expected: no errors related to `src/lib/theme.ts`. Pre-existing errors in other files are out of scope — note any but do not fix here.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/lib/theme.ts
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(theme): extract theme + accent state to lib/theme.ts

Centralizes localStorage read/write with safe try/catch (private-mode safe),
applies dark-side class + data-accent attribute, syncs aria-pressed on
all matching toggle controls.

Default: theme=dark, accent=cobalt (per spec §5.1, §5.4).
Legacy 'auto' migrates to dark on read.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Flip default theme to dark

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro:50-64` (the inline head boot script)

- [ ] **Step 1: Locate the inline boot script**

Open `site/src/layouts/BaseLayout.astro`. Find:
```js
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
```

- [ ] **Step 2: Replace with dark-default logic + accent attribute boot**

Replace the block above with:
```js
let saved = localStorage.getItem('cantopedia-theme');
/* Phase F: default theme is dark (WP10 original flavor). Legacy 'auto'
   and first-visit (null) both map to dark. Users with explicit 'light'
   or 'dark' preference are preserved (no surprise flips). */
if (saved === null || saved === 'auto') {
  saved = 'dark';
  try { localStorage.setItem('cantopedia-theme', 'dark'); } catch (e) {}
}
const isDark = saved === 'dark';
document.documentElement.classList.toggle('dark-side', isDark);

/* Phase F: accent persistence. data-accent drives --accent CSS var.
   Default cobalt. Reading this in the inline script (FOIT guard) avoids
   a flash of wrong accent on first paint. */
let accent = localStorage.getItem('cantopedia-accent');
if (!['cobalt', 'red', 'orange', 'emerald'].includes(accent)) accent = 'cobalt';
document.documentElement.setAttribute('data-accent', accent);
```

- [ ] **Step 3: Start dev server and verify clean-state default**

Run from `d:/Cantonese Cuisine/site`:
```bash
npm run dev
```

In a fresh browser (Chrome DevTools → Application → Clear storage → Clear site data), navigate to `http://localhost:4321/cantopedia/zh`. Expected:
- `<html class="dark-side" data-accent="cobalt" ...>`
- localStorage `cantopedia-theme` === `'dark'`, `cantopedia-accent` === `'cobalt'`

- [ ] **Step 4: Verify existing-preference users unaffected**

In DevTools: set `localStorage.cantopedia-theme = 'light'`, reload. Expected: `<html>` has no `dark-side` class. Repeat with `'dark'`. Expected: class present.

- [ ] **Step 5: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(theme): default to dark + bootstrap data-accent in head script

First-visit and legacy 'auto' users now land on dark theme + cobalt accent.
Existing explicit 'light'/'dark' preferences preserved (no surprise flips).
data-accent attribute drives --accent CSS var (defined in Task 4).

Spec ref: §5.1, §5.4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Define --accent CSS variable

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` `<style is:global>` block (~line 267+)

- [ ] **Step 1: Append accent palette to the existing :root block**

Find the `:root { ... }` block inside `<style is:global>` (starts around line 267). After the existing `--seal: #B71C1C;` line, add:
```css
/* WP10 Mobile accent palette — hex values from Microsoft's 20-color
   Themes and accent colors doc (§2.8). data-accent attribute (set by
   bootThemeAndAccent in lib/theme.ts) selects one of four. */
--accent: #3E65FF;        /* Cobalt — default per spec §5.4 */
--accent-fg: #FFFFFF;
```

- [ ] **Step 2: Add data-accent selectors below the :root block**

Immediately after the `}` closing the `:root` block, add:
```css
:root[data-accent="cobalt"]  { --accent: #3E65FF; }
:root[data-accent="red"]     { --accent: #E51400; }
:root[data-accent="orange"]  { --accent: #FA6800; }
:root[data-accent="emerald"] { --accent: #008A00; }
```

- [ ] **Step 3: Verify in dev server**

Open `http://localhost:4321/cantopedia/zh` in browser. In DevTools console:
```js
getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
```
Expected: `#3E65FF`.

Then:
```js
document.documentElement.setAttribute('data-accent', 'red');
getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
```
Expected: `#E51400`.

- [ ] **Step 4: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(theme): add --accent CSS variable + 4 accent options

Cobalt / Red / Orange / Emerald — exact hex from Microsoft WP10
Themes-and-accent-colors doc (spec §2.8, §5.4). Selected via
[data-accent="..."] attribute on <html>, set by lib/theme.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add probe for default dark + accent

**Files:**
- Create: `site/scripts/probe-dark-default.mjs`

- [ ] **Step 1: Write the probe**

Write `site/scripts/probe-dark-default.mjs`:
```javascript
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const URL = `http://localhost:${PORT}/cantopedia/zh`;

const browser = await chromium.launch();
let ok = true;

try {
  // Fresh context = empty localStorage.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => ({
    htmlClasses: document.documentElement.className,
    dataAccent: document.documentElement.getAttribute('data-accent'),
    storedTheme: localStorage.getItem('cantopedia-theme'),
    storedAccent: localStorage.getItem('cantopedia-accent'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));

  await page.screenshot({ path: resolve(OUT, 'dark-default.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'dark-default.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (!data.htmlClasses.includes('dark-side')) {
    console.error(`FAIL: <html> missing 'dark-side' class on fresh visit. classes="${data.htmlClasses}"`);
    ok = false;
  }
  if (data.dataAccent !== 'cobalt') {
    console.error(`FAIL: data-accent expected 'cobalt', got '${data.dataAccent}'`);
    ok = false;
  }
  if (data.storedTheme !== 'dark') {
    console.error(`FAIL: localStorage cantopedia-theme expected 'dark', got '${data.storedTheme}'`);
    ok = false;
  }
  if (data.accentVar !== '#3E65FF') {
    console.error(`FAIL: --accent computed value expected '#3E65FF', got '${data.accentVar}'`);
    ok = false;
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe against dev server**

With `npm run dev` running in another shell, run from `d:/Cantonese Cuisine/site`:
```bash
node scripts/probe-dark-default.mjs
```

Expected: probe prints JSON with `htmlClasses` containing `dark-side`, `dataAccent === "cobalt"`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/scripts/probe-dark-default.mjs
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
test(probe): verify default dark theme + cobalt accent on fresh visit

Fresh browser context (empty localStorage) → expects <html> has
dark-side class, data-accent="cobalt", localStorage persisted, and
--accent computes to #3E65FF.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Replace top nav with slim brand strip

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (the `<nav class="metro-nav app-bar" ...>` block, ~line 99-117)

- [ ] **Step 1: Replace nav block**

Find the existing `<nav>` block:
```html
{showNav && (
  <nav class="metro-nav app-bar" data-role="app-bar" data-expand="true" data-expand-point="0" aria-label="Site navigation" transition:persist>
    <a class="brand app-bar-brand" href={`${base}/${locale}`}>
      <span class="brand-name">CANTOPEDIA</span>
    </a>
    <button type="button" class="metro-nav-theme-btn" data-theme-toggle aria-label={dict.theme_toggle ?? 'Toggle theme'}>
      <span class="mif-sunny" aria-hidden="true"></span>
      <span class="mif-moon-right" aria-hidden="true"></span>
    </button>
    <ul class="app-bar-menu locale-switcher">
      {(['zh', 'yue', 'en'] as const).map((loc) => (
        <li>
          <a class={`pivot-tab ${loc === locale ? 'active' : ''}`} data-loc={loc} href={localeHref(loc)}>
            {loc === 'zh' ? '中' : loc === 'yue' ? '粵' : 'EN'}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)}
```

Replace with:
```html
{showNav && (
  <header class="top-strip" aria-label="Site brand" transition:persist>
    <a class="top-strip-brand" href={`${base}/${locale}`}>CANTOPEDIA</a>
  </header>
)}
```

- [ ] **Step 2: Add CSS for top-strip inside the existing `<style is:global>` block**

In `<style is:global>` (after the existing `:root` block), add:
```css
/* Phase A: slim 24px brand strip replacing the former top nav.
   Locale switcher + theme toggle now live in the bottom AppBar More menu. */
.top-strip {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-4);
  background: transparent;
  z-index: 10;
}
.top-strip-brand {
  font-family: var(--sans);
  font-size: var(--fs-tiny);
  font-weight: var(--fw-regular);
  letter-spacing: var(--ls-caps);
  text-transform: uppercase;
  color: var(--t-ink-dim);
  text-decoration: none;
}
.top-strip-brand:hover { color: var(--t-ink); }
```

- [ ] **Step 3: Verify the strip renders and the old nav is gone**

In dev server, navigate to `http://localhost:4321/cantopedia/zh`. Visually verify:
- A thin 24px strip at top showing `CANTOPEDIA` in uppercase small caps.
- No theme button, no locale tabs in the top region.
- Hub home tiles still render below.

The Hub will be **broken visually** at this point (height formula not yet updated) — that's expected; Task 13 fixes it. Just verify the strip itself looks right and the brand link clicks back to home.

- [ ] **Step 4: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(chrome): replace top horizontal nav with 24px slim brand strip

Phase A: brand-only top strip; locale switcher + theme toggle migrate
to the bottom AppBar More menu (next tasks). Strip is a placeholder until
Phase C lands the panorama big-title (spec §4.5).

Hub height regression is expected at this commit; fixed in Task 13.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Render bottom AppBar skeleton + 4 buttons

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` — add `<nav class="app-bar app-bar--bottom">` after the `</main>` close + before `<footer>`
- Modify: dict objects at `BaseLayout.astro:37-41` — add localized labels

- [ ] **Step 1: Extend the dict objects with AppBar labels**

Find the `dict` const at `BaseLayout.astro:37-41`:
```js
const dict = {
  zh: { yue: '粵語', zh: '中文', en: 'English', theme_toggle: '切换主题' },
  en: { yue: '粵語', zh: '中文', en: 'English', theme_toggle: 'Toggle theme' },
  yue: { yue: '粵語', zh: '中文', en: 'English', theme_toggle: '切換主題' },
}[locale];
```

Replace with:
```js
const dict = {
  zh: {
    yue: '粵語', zh: '中文', en: 'English',
    theme_toggle: '切换主题',
    nav_home: '首页', nav_search: '搜索', nav_random: '随机一菜', nav_more: '更多',
    menu_theme: '主题', menu_accent: '主题色', menu_language: '语言', menu_about: '关于',
    theme_light: '浅色', theme_dark: '深色',
    accent_cobalt: '钴蓝', accent_red: '番茄红', accent_orange: '香橙', accent_emerald: '翡翠绿',
  },
  en: {
    yue: '粵語', zh: '中文', en: 'English',
    theme_toggle: 'Toggle theme',
    nav_home: 'Home', nav_search: 'Search', nav_random: 'Random dish', nav_more: 'More',
    menu_theme: 'Theme', menu_accent: 'Accent', menu_language: 'Language', menu_about: 'About',
    theme_light: 'Light', theme_dark: 'Dark',
    accent_cobalt: 'Cobalt', accent_red: 'Red', accent_orange: 'Orange', accent_emerald: 'Emerald',
  },
  yue: {
    yue: '粵語', zh: '中文', en: 'English',
    theme_toggle: '切換主題',
    nav_home: '主頁', nav_search: '搵嘢', nav_random: '隨機餸', nav_more: '更多',
    menu_theme: '主題', menu_accent: '主題色', menu_language: '語言', menu_about: '關於',
    theme_light: '淺色', theme_dark: '深色',
    accent_cobalt: '鈷藍', accent_red: '番茄紅', accent_orange: '香橙', accent_emerald: '翡翠綠',
  },
}[locale];
```

- [ ] **Step 2: Insert AppBar markup**

In the `<body>` of `BaseLayout.astro`, find `</main>`. Immediately after `</main>` and before `<footer>`, insert:
```html
<nav class="app-bar app-bar--bottom" aria-label="Application bar" transition:persist>
  <a class="appbar-btn wp-tile" data-appbar="home" href={`${base}/${locale}`} aria-label={dict.nav_home}>
    <span class="mif-home" aria-hidden="true"></span>
  </a>
  <a class="appbar-btn wp-tile" data-appbar="search" href={`${base}/${locale}/search`} aria-label={dict.nav_search}>
    <span class="mif-search" aria-hidden="true"></span>
  </a>
  <button type="button" class="appbar-btn wp-tile" data-appbar="random" aria-label={dict.nav_random}>
    <span class="mif-shuffle" aria-hidden="true"></span>
  </button>
  <button type="button" class="appbar-btn wp-tile" data-appbar="more" aria-expanded="false" aria-controls="appbar-more-menu" aria-label={dict.nav_more}>
    <span class="mif-more-vert" aria-hidden="true"></span>
  </button>
</nav>
```

- [ ] **Step 3: Add AppBar CSS to `<style is:global>`**

Append to the `<style is:global>` block:
```css
/* Phase A: bottom AppBar — WP10 Mobile geometry, Acrylic backdrop.
   Spec ref: §4.1, §4.3. Tilt-press inherited from .wp-tile global delegation. */
.app-bar--bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  z-index: 1000;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
}
.dark-side .app-bar--bottom {
  border-top-color: rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.85);
}
@supports (backdrop-filter: blur(30px)) or (-webkit-backdrop-filter: blur(30px)) {
  .app-bar--bottom {
    backdrop-filter: blur(30px) saturate(125%);
    -webkit-backdrop-filter: blur(30px) saturate(125%);
    background: rgba(255, 255, 255, 0.7);
  }
  .dark-side .app-bar--bottom {
    background: rgba(0, 0, 0, 0.6);
  }
  .app-bar--bottom::before {
    /* Acrylic grain overlay using existing --acrylic-noise SVG token */
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--acrylic-noise);
    opacity: 0.35;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
}
.appbar-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: transparent;
  color: var(--t-ink);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--fluent-duration-fast) var(--fluent-curve-easy-ease);
}
.appbar-btn:hover,
.appbar-btn:focus-visible {
  background: rgba(0, 0, 0, 0.06);
  outline: none;
}
.dark-side .appbar-btn:hover,
.dark-side .appbar-btn:focus-visible {
  background: rgba(255, 255, 255, 0.08);
}
.appbar-btn [class^="mif-"] {
  font-size: 22px;
  line-height: 1;
}
/* Active route indicator — 2px accent underline */
.appbar-btn[aria-current="page"]::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--accent);
}
@media print {
  .app-bar--bottom, .top-strip { display: none; }
}
```

- [ ] **Step 4: Wire up Random button + aria-current**

Inside the `<script>` block at the bottom of `BaseLayout.astro` (where existing global scripts live, after the `setupTiltPress` IIFE around line 211), add a new IIFE:
```js
/* Phase A: AppBar Random button + aria-current sync. */
(function setupAppBar() {
  function pickRandomDish() {
    const cfg = window.__hubBoot;
    if (!cfg || !Array.isArray(cfg.dishesData) || cfg.dishesData.length === 0) return null;
    const d = cfg.dishesData[Math.floor(Math.random() * cfg.dishesData.length)];
    return `${cfg.base}/${cfg.locale}/dishes/${d.id}`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-appbar="random"]') : null;
    if (!t) return;
    const href = pickRandomDish();
    if (href) window.location.href = href;
  });
  function syncAriaCurrent() {
    const path = location.pathname.replace(/\/$/, '');
    document.querySelectorAll('[data-appbar]').forEach((el) => {
      const which = el.getAttribute('data-appbar');
      const href = el.getAttribute('href');
      const matches = which === 'search' ? path.endsWith('/search')
        : which === 'home' ? (href && path.endsWith(href.replace(/\/$/, '')))
        : false;
      if (matches) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }
  syncAriaCurrent();
  document.addEventListener('astro:page-load', syncAriaCurrent);
})();
```

This depends on `window.__hubBoot` which is set by [Hub.astro:319-321](../../../site/src/components/Hub.astro) on home/browse pages. On other pages, the Random button falls back to no-op (acceptable — user can scroll to home first).

- [ ] **Step 5: Verify visually**

Reload `http://localhost:4321/cantopedia/zh` in dev server. Expected:
- Fixed bottom bar with 4 circular buttons.
- Acrylic blur visible behind the bar (translate the page to scroll content under).
- Tap Random → navigates to a random dish (browser console can log: `Object.keys(window.__hubBoot)`).
- Tap Home circle → returns to home.
- Hover any button → subtle background tint.
- Tap any button → 3deg tilt press animation (inherited from `setupTiltPress`).

- [ ] **Step 6: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(chrome): bottom AppBar with 4 circular buttons + Acrylic

Phase A §4.1, §4.2, §4.3: 72px fixed-bottom bar, blur(30px) saturate(125%)
backdrop-filter + acrylic noise overlay (--acrylic-noise SVG token), 4
buttons Home / Search / Random / More with currentColor 1.5px outlined
44px circle (touch target), tilt-press inherited via .wp-tile class.

Random button picks from window.__hubBoot.dishesData (set on home/browse
pages). aria-current="page" syncs on every astro:page-load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Build More menu overlay (HTML + CSS)

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Insert overlay markup immediately after the AppBar nav**

Right after the closing `</nav>` of the AppBar (Task 7), and still before `<footer>`, insert:
```html
<div
  id="appbar-more-menu"
  class="appbar-more"
  role="dialog"
  aria-label={dict.nav_more}
  aria-hidden="true"
  transition:persist
>
  <div class="appbar-more-inner">
    <section class="appbar-more-section">
      <div class="menu-label">{dict.menu_theme}</div>
      <div class="theme-tiles">
        <button type="button" class="theme-tile wp-tile" data-theme="light" aria-pressed="false">
          <span class="mif-sunny" aria-hidden="true"></span>
          <span class="theme-tile-text">{dict.theme_light}</span>
        </button>
        <button type="button" class="theme-tile wp-tile" data-theme="dark" aria-pressed="true">
          <span class="mif-moon-right" aria-hidden="true"></span>
          <span class="theme-tile-text">{dict.theme_dark}</span>
        </button>
      </div>
    </section>

    <section class="appbar-more-section">
      <div class="menu-label">{dict.menu_accent}</div>
      <div class="accent-swatches">
        <button type="button" class="accent-swatch" data-accent-swatch="cobalt" aria-pressed="true" aria-label={dict.accent_cobalt}>
          <span class="swatch-dot" style="background: #3E65FF"></span>
        </button>
        <button type="button" class="accent-swatch" data-accent-swatch="red" aria-pressed="false" aria-label={dict.accent_red}>
          <span class="swatch-dot" style="background: #E51400"></span>
        </button>
        <button type="button" class="accent-swatch" data-accent-swatch="orange" aria-pressed="false" aria-label={dict.accent_orange}>
          <span class="swatch-dot" style="background: #FA6800"></span>
        </button>
        <button type="button" class="accent-swatch" data-accent-swatch="emerald" aria-pressed="false" aria-label={dict.accent_emerald}>
          <span class="swatch-dot" style="background: #008A00"></span>
        </button>
      </div>
    </section>

    <section class="appbar-more-section">
      <div class="menu-label">{dict.menu_language}</div>
      <div class="locale-pivot">
        {(['zh', 'yue', 'en'] as const).map((loc) => (
          <a class={`pivot-tab ${loc === locale ? 'active' : ''}`} data-loc={loc} href={localeHref(loc)}>
            {loc === 'zh' ? '中' : loc === 'yue' ? '粵' : 'EN'}
          </a>
        ))}
      </div>
    </section>

    <section class="appbar-more-section appbar-more-about">
      <a href="https://github.com/ShepherdLoveYou/cantopedia" target="_blank" rel="noopener" class="about-row">
        <span class="mif-github" aria-hidden="true"></span>
        <span>GitHub · MIT · CC BY-SA 4.0</span>
      </a>
    </section>
  </div>
</div>
```

- [ ] **Step 2: Add overlay CSS**

In `<style is:global>`, append:
```css
/* Phase A §4.4: More menu overlay. Slides up from below the AppBar.
   Initial state hidden (translateY 100%). Open state translateY 0,
   pointer-events all. Animation driven by Motion One in inline script. */
.appbar-more {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 72px;
  z-index: 999;
  max-height: 60vh;
  overflow-y: auto;
  transform: translateY(100%);
  pointer-events: none;
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
.dark-side .appbar-more {
  background: rgba(0, 0, 0, 0.92);
  border-top-color: rgba(255, 255, 255, 0.08);
}
@supports (backdrop-filter: blur(30px)) or (-webkit-backdrop-filter: blur(30px)) {
  .appbar-more {
    backdrop-filter: blur(30px) saturate(125%);
    -webkit-backdrop-filter: blur(30px) saturate(125%);
    background: rgba(255, 255, 255, 0.7);
  }
  .dark-side .appbar-more {
    background: rgba(0, 0, 0, 0.6);
  }
}
.appbar-more[aria-hidden="false"] {
  pointer-events: auto;
}
.appbar-more-inner {
  padding: var(--sp-5) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.appbar-more-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.menu-label {
  font-family: var(--sans);
  font-size: var(--fs-tiny);
  font-weight: var(--fw-regular);
  letter-spacing: var(--ls-caps);
  text-transform: uppercase;
  color: var(--t-ink-dim);
}
.theme-tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}
.theme-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  height: 48px;
  padding: 0 var(--sp-4);
  background: var(--t-plate);
  color: var(--t-ink);
  border: 0;
  font-family: var(--sans);
  font-size: var(--fs-body);
  cursor: pointer;
}
.theme-tile[aria-pressed="true"] {
  background: var(--accent);
  color: var(--accent-fg);
}
.theme-tile [class^="mif-"] {
  font-size: 18px;
}
.accent-swatches {
  display: flex;
  gap: var(--sp-3);
}
.accent-swatch {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.accent-swatch[aria-pressed="true"] {
  border-color: var(--t-ink);
}
.swatch-dot {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.locale-pivot {
  display: flex;
  gap: var(--sp-3);
}
.locale-pivot .pivot-tab {
  padding: var(--sp-2) var(--sp-4);
  background: var(--t-plate);
  color: var(--t-ink);
  text-decoration: none;
  font-family: var(--sans);
  font-size: var(--fs-body);
}
.locale-pivot .pivot-tab.active {
  background: var(--accent);
  color: var(--accent-fg);
}
.about-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--t-ink-dim);
  text-decoration: none;
  font-family: var(--sans);
  font-size: var(--fs-tiny);
  letter-spacing: var(--ls-meta);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--t-rule);
}
.about-row:hover { color: var(--t-ink); }
```

- [ ] **Step 3: Verify the menu renders (hidden state)**

Reload home. Open DevTools → Elements → find `<div id="appbar-more-menu">`. Expected:
- `aria-hidden="true"`
- `transform: translateY(100%)` computed
- Children render but invisible (off-screen below).

In DevTools console:
```js
document.getElementById('appbar-more-menu').setAttribute('aria-hidden', 'false');
document.getElementById('appbar-more-menu').style.transform = 'translateY(0)';
```
Menu should pop up above the AppBar with theme tiles, accent swatches, locale pivot, and the about row visible. Theme tiles read "浅色 / 深色" in zh. Cobalt swatch has a black ring border.

Reset:
```js
document.getElementById('appbar-more-menu').setAttribute('aria-hidden', 'true');
document.getElementById('appbar-more-menu').style.transform = 'translateY(100%)';
```

- [ ] **Step 4: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(chrome): More menu overlay markup + CSS

Phase A §4.4: dialog with theme tiles, accent swatches, locale pivot tabs,
and about row. Hidden by default (translateY 100%, pointer-events none,
aria-hidden true). Acrylic backdrop matches AppBar. Slide animation wired
up in Task 9. Click handlers wired in Task 10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Wire More menu open/close with Motion One

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` — add a new `<script>` block

- [ ] **Step 1: Add a typed script block**

After the existing `<script>` blocks at the bottom of `BaseLayout.astro` (after the theme toggle IIFE around line 266), add a new script block:
```html
<script>
  import { animate } from 'motion';

  /* Phase A §4.4: open/close the AppBar More menu with Motion One.
     Uses --fluent-duration-normal (open, decel) and --fluent-duration-fast
     (close, accel). All async waits via Animation.finished, no setTimeout. */
  (function setupMoreMenu() {
    let isOpen = false;
    let currentAnim: any = null;

    function getMenu() { return document.getElementById('appbar-more-menu'); }
    function getTrigger() {
      return document.querySelector<HTMLButtonElement>('[data-appbar="more"]');
    }

    async function openMenu() {
      const menu = getMenu();
      const trigger = getTrigger();
      if (!menu || isOpen) return;
      isOpen = true;
      menu.setAttribute('aria-hidden', 'false');
      trigger?.setAttribute('aria-expanded', 'true');
      if (currentAnim) currentAnim.stop();
      currentAnim = animate(
        menu,
        { transform: ['translateY(100%)', 'translateY(0)'] },
        { duration: 0.28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      await currentAnim.finished;
    }

    async function closeMenu() {
      const menu = getMenu();
      const trigger = getTrigger();
      if (!menu || !isOpen) return;
      isOpen = false;
      trigger?.setAttribute('aria-expanded', 'false');
      if (currentAnim) currentAnim.stop();
      currentAnim = animate(
        menu,
        { transform: ['translateY(0)', 'translateY(100%)'] },
        { duration: 0.18, easing: 'cubic-bezier(0.55, 0, 0.9, 0.3)' }
      );
      await currentAnim.finished;
      menu.setAttribute('aria-hidden', 'true');
    }

    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      // Open / close on trigger button
      if (target.closest('[data-appbar="more"]')) {
        isOpen ? closeMenu() : openMenu();
        return;
      }
      // Click outside menu while open → close
      if (isOpen && !target.closest('#appbar-more-menu')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });

    /* SPA-swap: close menu on navigation; pivot/dish pages don't carry it open. */
    document.addEventListener('astro:before-preparation', () => {
      if (isOpen) closeMenu();
    });
  })();
</script>
```

- [ ] **Step 2: Verify Motion One imports**

Trigger a dev server reload. Watch Vite output. Expected: no error about `motion` not resolving. If error appears, confirm Task 1 ran (`motion` in `site/package.json` dependencies).

- [ ] **Step 3: Smoke-test interactively**

Reload home in browser. Tap `⋯` button (slot 4). Expected:
- Menu slides up over ~280ms with smooth Decelerate ease.
- `aria-hidden` flips to `"false"`.
- Trigger `aria-expanded` flips to `"true"`.

Tap `⋯` again. Expected: slides down over ~180ms with Accelerate ease, `aria-hidden` back to `"true"`.

Open again, then tap outside the menu (e.g. anywhere in the Hub above). Expected: menu closes.

Open again, press `Escape`. Expected: menu closes.

Open menu, then tap a navigation link (e.g. tap Home button). Expected: menu closes before navigation (via `astro:before-preparation`).

- [ ] **Step 4: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(chrome): Motion-One-driven More menu slide-up / slide-down

Phase A §4.4: 280ms decelerate open, 180ms accelerate close. Promise-based
(Animation.finished) — no setTimeout. Closes on click outside, Escape,
or SPA navigation (astro:before-preparation).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Wire theme tiles + accent swatches to lib/theme.ts

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` — replace the existing inline theme click handler IIFE (~line 220-266)

- [ ] **Step 1: Replace the existing theme-toggle IIFE**

Find the IIFE that starts with `(function () {` around line 221 and contains the `applyTheme` function inline. Replace the entire block (including the `<script>` opening if present) with:
```html
<script>
  import { bootThemeAndAccent, applyTheme, applyAccent, type Accent } from '~/lib/theme';

  /* Phase F: delegated click handlers for theme tiles + accent swatches.
     applyTheme/applyAccent live in lib/theme.ts (single source of truth);
     SPA-swap copies dark-side class + data-accent across, Astro's persist
     keeps the menu DOM. */
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const themeTile = target.closest<HTMLButtonElement>('button[data-theme]');
    if (themeTile && (themeTile.dataset.theme === 'light' || themeTile.dataset.theme === 'dark')) {
      applyTheme(themeTile.dataset.theme);
      return;
    }
    const swatch = target.closest<HTMLButtonElement>('button[data-accent-swatch]');
    if (swatch) {
      const a = swatch.dataset.accentSwatch as Accent | undefined;
      if (a === 'cobalt' || a === 'red' || a === 'orange' || a === 'emerald') {
        applyAccent(a);
      }
    }
  });

  /* Carry theme + accent across SPA swap before the new doc paints. */
  document.addEventListener('astro:before-swap', (e: any) => {
    if (document.documentElement.classList.contains('dark-side')) {
      e.newDocument.documentElement.classList.add('dark-side');
    }
    const accent = document.documentElement.getAttribute('data-accent');
    if (accent) e.newDocument.documentElement.setAttribute('data-accent', accent);
  });

  /* On each page load, re-sync aria-pressed on theme tiles + accent swatches. */
  document.addEventListener('astro:page-load', () => {
    bootThemeAndAccent();
  });

  /* Initial sync — runs once at script load. */
  bootThemeAndAccent();
</script>
```

- [ ] **Step 2: Verify theme switching**

Reload home. Tap `⋯` → menu opens. Tap "浅色" (light) tile. Expected:
- Page background flips to white.
- Light tile gets `aria-pressed="true"`, dark tile gets `aria-pressed="false"`.
- localStorage `cantopedia-theme === 'light'`.

Tap "深色" (dark). Expected: reverts to dark, swatch press states flip back.

- [ ] **Step 3: Verify accent switching**

With menu open, tap the Red swatch (second). Expected:
- The swatch border ring moves from Cobalt to Red.
- `<html data-accent="red">`.
- The active locale pivot tab (`中`) flips background from blue to red.
- The selected theme tile flips background to red.
- localStorage `cantopedia-accent === 'red'`.

Close menu, navigate to `/cantopedia/zh/all`. Expected:
- `<html data-accent="red">` persists.
- AppList letter headers (currently hardcoded `--m-red`, will be migrated in Task 11) still render — no regression yet.

- [ ] **Step 4: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(theme): wire theme tiles + accent swatches to lib/theme.ts

Phase F: delegated clicks on [data-theme] + [data-accent-swatch].
SPA-swap copies dark-side + data-accent to incoming doc (no flash).
Page-load re-syncs aria-pressed on toggle controls.

Replaces the prior inline theme-toggle IIFE — single source of truth
moves to lib/theme.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Migrate accent-eligible surfaces to var(--accent)

Spec §5.5 lists 5 components that should respond to the accent picker. The AppBar active-indicator (T7) and locale pivot tabs (T8) already use `var(--accent)`. This task migrates the remaining three: AppList letter headers, Featured tile label band, and the loading bar.

**Files:**
- Modify: `site/src/components/AppListPanel.astro`
- Modify: `site/src/components/Hub.astro`
- Modify: `site/src/layouts/BaseLayout.astro` (search for `.loading-bar` rule)

- [ ] **Step 1: AppList letter — replace --m-red with --accent**

In `AppListPanel.astro`, find:
```css
.app-list-letter {
  font-family: var(--sans);
  font-size: var(--fs-title);
  font-weight: var(--fw-light);
  color: var(--m-red);
  ...
}
```

Change `color: var(--m-red);` to `color: var(--accent);`. Leave the rest unchanged.

- [ ] **Step 2: Featured tile label band — add accent influence on hover/active**

In `Hub.astro` `<style>` block (search for `.featured-tile .featured-label`), append a new rule:
```css
/* Featured wide tile: label band picks up the user's accent on focus/active.
   Default state stays neutral so the underlying dish photo doesn't compete
   with the accent color. */
.featured-tile:hover .featured-label,
.featured-tile:focus-visible .featured-label {
  color: var(--accent);
}
```

- [ ] **Step 3: Loading bar — switch to var(--accent)**

The loading bar lives in `BaseLayout.astro:98` (`<div class="loading-bar" id="loading-bar" ...>`). Search the global stylesheet for a `.loading-bar` rule. If the rule sets a `background` or `background-color`, change it to:
```css
background: var(--accent);
```

If no `.loading-bar` rule exists in `BaseLayout.astro` (it may be defined elsewhere or rely on default), add this rule inside the `<style is:global>` block:
```css
.loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0;
  background: var(--accent);
  z-index: 9999;
  transition: width 0.4s var(--fluent-curve-easy-ease);
  pointer-events: none;
}
.loading-bar.loading {
  width: 100%;
  transition: width 1.5s linear;
}
```

(If the rule already exists with a different color, only change `background`. Don't restructure.)

- [ ] **Step 4: Verify all four accent-eligible surfaces respond**

With dev server running, navigate through each surface:

1. `http://localhost:4321/cantopedia/zh/all` → tap each of the 4 accent swatches in `⋯` menu → AppList letter headers recolor.
2. `http://localhost:4321/cantopedia/zh` → hover the Featured wide tile (top-left of Hub home) → its lower label band ("今日推介" etc.) recolors to the accent.
3. From home, click any dish tile → during navigation, the loading bar at the top is the accent color.
4. AppBar home button's active underline (when on home) and locale pivot tab's active pill (in More menu) — already accent-driven from Tasks 7 + 8 — should also visibly track the swatch.

- [ ] **Step 5: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/components/AppListPanel.astro site/src/components/Hub.astro site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(theme): three more surfaces honor --accent (spec §5.5)

- AppList letter headers: var(--m-red) → var(--accent)
- Featured tile label band: accent color on hover/focus
- Loading bar: accent color

AppBar active-indicator and locale pivot tabs already use --accent
from Tasks 7 and 8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Update Hub height formula for new chrome

**Files:**
- Modify: `site/src/components/Hub.astro:410` (the `.hub` `height` rule)

- [ ] **Step 1: Replace the height calc**

In `Hub.astro`, find:
```css
.hub {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100vw;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  height: calc(100vh - 120px);
  min-height: 480px;
  overscroll-behavior-x: contain;
}
```

Change `height: calc(100vh - 120px);` to:
```css
height: calc(100vh - 24px - 56px - 72px);  /* top strip 24 + hub-pivot 56 + AppBar 72 */
```

- [ ] **Step 2: Verify Hub scroll-snap restored**

Reload `http://localhost:4321/cantopedia/zh`. Expected:
- Hub home panel fills viewport height down to the AppBar (no overlap, no truncation).
- Horizontal scroll-snap between panels works.
- Tiles render fully visible (not partially clipped at the bottom).

Resize the window to ~700px tall. Hub should still fit; if `min-height: 480px` kicks in, you'll get vertical overflow inside the panel (expected — `min-height` floors the calc).

- [ ] **Step 3: Add `<main>` padding-bottom for non-Hub pages**

The Hub home page uses `main:has(#hub) { padding: 0 }` (see [Hub.astro:732-738](../../../site/src/components/Hub.astro)). Other pages don't — they need explicit padding so content isn't hidden behind the AppBar.

In `BaseLayout.astro`'s `<style is:global>`, find the `:root` block. After it (or near the existing `main {` rule if any), add:
```css
/* Phase A: reserve room for fixed bottom AppBar (72px) + 16 buffer. */
main {
  padding-bottom: 88px;
}
/* Hub home panel has its own layout — it manages bottom space via .hub height calc. */
main:has(#hub) {
  padding-bottom: 0;
}
```

- [ ] **Step 4: Verify non-Hub pages don't overlap AppBar**

Navigate to `http://localhost:4321/cantopedia/zh/dishes/cha-can` (or any dish id). Scroll to the bottom. Expected:
- Last content row sits clearly above the AppBar (88px gap).
- No content hidden by the AppBar.

Navigate to `http://localhost:4321/cantopedia/zh/search`. Same expectation.

- [ ] **Step 5: Verify dark theme colors match spec §5.2**

Spec §5.2 requires `--t-bg = #000000` and `--t-ink = #FFFFFF` in dark mode. The existing token alias forwards `--t-bg` → `--body-background` (Metro), which may not be exactly `#000000`. Verify in DevTools console on home page (dark mode, fresh visit):
```js
const cs = getComputedStyle(document.documentElement);
console.log('--t-bg =', cs.getPropertyValue('--t-bg').trim());
console.log('--t-ink =', cs.getPropertyValue('--t-ink').trim());
console.log('body bg =', getComputedStyle(document.body).backgroundColor);
```

Expected: `--t-bg` resolves to a value with rgb red+green+blue ≤ 8 (effectively black; pure `#000000` if Metro's dark theme matches). `body bg` should be `rgb(0, 0, 0)` or near-black.

If `body bg` is **not** near-black (e.g. `rgb(30, 30, 30)` or similar), add an explicit override at the **end** of the `.dark-side` block in `BaseLayout.astro`:
```css
.dark-side {
  --t-bg: #000000;
  --t-ink: #FFFFFF;
}
```

(Append, not replace — the existing `.dark-side` block has the `--t-plate-dark / --t-card / --t-ink-dim` overrides we want to keep.)

After the override (if needed), reload and re-check the computed values.

- [ ] **Step 6: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/components/Hub.astro site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
fix(layout): adjust Hub height + main padding for bottom AppBar

Phase A §6: Hub height now calc(100vh - 24px - 56px - 72px) accounting
for new 24px top strip + 56px hub-pivot + 72px AppBar. Non-Hub pages get
padding-bottom: 88px to clear the AppBar; Hub home overrides to 0 via
main:has(#hub).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Reduced-motion + Acrylic fallback

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` — extend the More menu script

- [ ] **Step 1: Respect prefers-reduced-motion in Motion One animations**

In the More menu script (Task 9), modify `openMenu` and `closeMenu` to skip animation when reduced motion is preferred. Replace the script's body inside `setupMoreMenu` with:
```typescript
let isOpen = false;
let currentAnim: any = null;
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getMenu() { return document.getElementById('appbar-more-menu'); }
function getTrigger() {
  return document.querySelector<HTMLButtonElement>('[data-appbar="more"]');
}

async function openMenu() {
  const menu = getMenu();
  const trigger = getTrigger();
  if (!menu || isOpen) return;
  isOpen = true;
  menu.setAttribute('aria-hidden', 'false');
  trigger?.setAttribute('aria-expanded', 'true');
  if (prefersReduced()) {
    menu.style.transform = 'translateY(0)';
    return;
  }
  if (currentAnim) currentAnim.stop();
  currentAnim = animate(
    menu,
    { transform: ['translateY(100%)', 'translateY(0)'] },
    { duration: 0.28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
  await currentAnim.finished;
}

async function closeMenu() {
  const menu = getMenu();
  const trigger = getTrigger();
  if (!menu || !isOpen) return;
  isOpen = false;
  trigger?.setAttribute('aria-expanded', 'false');
  if (prefersReduced()) {
    menu.style.transform = 'translateY(100%)';
    menu.setAttribute('aria-hidden', 'true');
    return;
  }
  if (currentAnim) currentAnim.stop();
  currentAnim = animate(
    menu,
    { transform: ['translateY(0)', 'translateY(100%)'] },
    { duration: 0.18, easing: 'cubic-bezier(0.55, 0, 0.9, 0.3)' }
  );
  await currentAnim.finished;
  menu.setAttribute('aria-hidden', 'true');
}
```

Leave the click and keydown handlers below unchanged.

- [ ] **Step 2: Verify reduced motion path**

In Chrome DevTools: open command palette (Cmd/Ctrl+Shift+P), type "Emulate CSS prefers-reduced-motion", choose "reduce". Reload home. Tap `⋯`. Expected:
- Menu appears instantly (no slide).
- Closes instantly on second tap or Escape.

Reset reduced-motion override.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
feat(a11y): More menu respects prefers-reduced-motion

Phase A §8: when user has reduced-motion preference, menu open/close
skips Motion One animation and toggles transform instantly. aria-hidden
still updates correctly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Probe — AppBar geometry + Acrylic

**Files:**
- Create: `site/scripts/probe-appbar-acrylic.mjs`

- [ ] **Step 1: Write the probe**

Write `site/scripts/probe-appbar-acrylic.mjs`:
```javascript
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
let ok = true;

try {
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });  // iPhone-ish
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const bar = document.querySelector('.app-bar--bottom');
    const buttons = Array.from(document.querySelectorAll('[data-appbar]'));
    if (!bar) return { error: 'no AppBar' };
    const cs = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    return {
      barExists: true,
      height: rect.height,
      bottom: window.innerHeight - rect.bottom,
      position: cs.position,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      buttonCount: buttons.length,
      buttonSlots: buttons.map((b) => b.getAttribute('data-appbar')),
      buttonLabels: buttons.map((b) => b.getAttribute('aria-label')),
      hasWpTileClass: buttons.every((b) => b.classList.contains('wp-tile')),
      circleBorder: getComputedStyle(buttons[0]).borderRadius,
    };
  });

  await page.screenshot({ path: resolve(OUT, 'appbar-acrylic.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'appbar-acrylic.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (!data.barExists) { console.error('FAIL: AppBar element not found'); ok = false; }
  if (Math.round(data.height) !== 72) { console.error(`FAIL: AppBar height expected 72, got ${data.height}`); ok = false; }
  if (Math.round(data.bottom) !== 0) { console.error(`FAIL: AppBar bottom offset expected 0, got ${data.bottom}`); ok = false; }
  if (data.position !== 'fixed') { console.error(`FAIL: AppBar position expected 'fixed', got '${data.position}'`); ok = false; }
  if (data.buttonCount !== 4) { console.error(`FAIL: expected 4 buttons, got ${data.buttonCount}`); ok = false; }
  const expectedSlots = ['home', 'search', 'random', 'more'];
  if (JSON.stringify(data.buttonSlots) !== JSON.stringify(expectedSlots)) {
    console.error(`FAIL: expected slots ${expectedSlots}, got ${data.buttonSlots}`);
    ok = false;
  }
  if (!data.hasWpTileClass) { console.error('FAIL: AppBar buttons missing wp-tile class (tilt-press won\'t work)'); ok = false; }
  if (data.buttonLabels.some((l) => !l)) { console.error(`FAIL: some buttons missing aria-label: ${data.buttonLabels}`); ok = false; }
  // backdrop-filter may be 'none' on Firefox; spec says fallback is OK there.
  // Chromium should show 'blur(30px) saturate(125%)' or similar.
  if (!data.backdropFilter || data.backdropFilter === 'none') {
    console.warn(`WARN: backdrop-filter is '${data.backdropFilter}'. Acceptable only on browsers without support.`);
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe**

With `npm run dev` running, from `site/`:
```bash
node scripts/probe-appbar-acrylic.mjs
```

Expected output (JSON): `barExists: true`, `height: 72`, `bottom: 0`, `position: 'fixed'`, `buttonCount: 4`, `buttonSlots: ['home','search','random','more']`, `hasWpTileClass: true`, `backdropFilter: 'blur(30px) saturate(125%)'`. Exit 0.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/scripts/probe-appbar-acrylic.mjs
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
test(probe): verify AppBar geometry, slots, and Acrylic backdrop-filter

Asserts: 72px height, position fixed bottom 0, 4 buttons with slots
[home, search, random, more], wp-tile class on all (tilt-press inheritance),
backdrop-filter computed style. iPhone viewport (414×896).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Probe — More menu open/close + accent click

**Files:**
- Create: `site/scripts/probe-more-menu.mjs`

- [ ] **Step 1: Write the probe**

Write `site/scripts/probe-more-menu.mjs`:
```javascript
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
let ok = true;

try {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  // 1. Tap the More button.
  await page.locator('[data-appbar="more"]').click();
  // Motion One open animation: 280ms. Wait for finish.
  await page.waitForTimeout(400);

  const afterOpen = await page.evaluate(() => {
    const menu = document.getElementById('appbar-more-menu');
    const trigger = document.querySelector('[data-appbar="more"]');
    return {
      ariaHidden: menu?.getAttribute('aria-hidden'),
      triggerExpanded: trigger?.getAttribute('aria-expanded'),
      transform: menu ? getComputedStyle(menu).transform : null,
      hasThemeTiles: !!menu?.querySelector('button[data-theme]'),
      hasAccentSwatches: !!menu?.querySelector('button[data-accent-swatch]'),
      hasLocalePivot: !!menu?.querySelector('.locale-pivot'),
    };
  });

  // 2. Click a different accent swatch (red).
  await page.locator('[data-accent-swatch="red"]').click();
  await page.waitForTimeout(50);

  const afterAccent = await page.evaluate(() => ({
    dataAccent: document.documentElement.getAttribute('data-accent'),
    storedAccent: localStorage.getItem('cantopedia-accent'),
    pressedSwatch: document.querySelector('button[data-accent-swatch][aria-pressed="true"]')?.getAttribute('data-accent-swatch'),
    accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));

  // 3. Press Escape to close.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const afterClose = await page.evaluate(() => {
    const menu = document.getElementById('appbar-more-menu');
    return {
      ariaHidden: menu?.getAttribute('aria-hidden'),
      transform: menu ? getComputedStyle(menu).transform : null,
    };
  });

  const data = { afterOpen, afterAccent, afterClose };
  await page.screenshot({ path: resolve(OUT, 'more-menu.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'more-menu.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (afterOpen.ariaHidden !== 'false') { console.error(`FAIL: menu still aria-hidden after open: ${afterOpen.ariaHidden}`); ok = false; }
  if (afterOpen.triggerExpanded !== 'true') { console.error(`FAIL: trigger aria-expanded not true: ${afterOpen.triggerExpanded}`); ok = false; }
  if (!afterOpen.hasThemeTiles) { console.error('FAIL: theme tiles missing in menu'); ok = false; }
  if (!afterOpen.hasAccentSwatches) { console.error('FAIL: accent swatches missing in menu'); ok = false; }
  if (afterAccent.dataAccent !== 'red') { console.error(`FAIL: data-accent after red click: ${afterAccent.dataAccent}`); ok = false; }
  if (afterAccent.storedAccent !== 'red') { console.error(`FAIL: localStorage cantopedia-accent: ${afterAccent.storedAccent}`); ok = false; }
  if (afterAccent.pressedSwatch !== 'red') { console.error(`FAIL: pressed swatch should be red: ${afterAccent.pressedSwatch}`); ok = false; }
  if (afterAccent.accentVar !== '#E51400') { console.error(`FAIL: --accent after red: ${afterAccent.accentVar}`); ok = false; }
  if (afterClose.ariaHidden !== 'true') { console.error(`FAIL: menu still open after Escape: ${afterClose.ariaHidden}`); ok = false; }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run probe**

With dev server running, from `site/`:
```bash
node scripts/probe-more-menu.mjs
```

Expected: JSON dump with three phase objects, all assertions pass, exit 0.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/scripts/probe-more-menu.mjs
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
test(probe): verify More menu open / accent swap / Escape close

Three-phase probe: (1) tap More button → menu aria-hidden=false, trigger
aria-expanded=true, theme/accent/locale all present. (2) click Red accent
swatch → data-accent=red, localStorage persists, --accent computes #E51400,
aria-pressed flips to red swatch. (3) Escape → aria-hidden=true.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Final regression sweep

**Files:**
- (no file changes — verification step)

- [ ] **Step 1: Run all three Phase A+F probes sequentially**

Ensure `npm run dev` is running in `site/`. From `d:/Cantonese Cuisine/site`:
```bash
node scripts/probe-dark-default.mjs && \
node scripts/probe-appbar-acrylic.mjs && \
node scripts/probe-more-menu.mjs
```

Expected: all three exit 0. JSON dumps written to `site/probe-out/`.

- [ ] **Step 2: Sanity-check non-AppBar features didn't regress**

In dev server, manually verify (visual + click):
1. Home (`/cantopedia/zh`) — Hub 9-panel horizontal scroll-snap still works (drag/scroll left-right between home, applist, 8 categories).
2. Cat-tile 3D card-flip still animates on home (categories tiles flip image ↔ icon every ~7s).
3. Featured wide tile slide-up cycle still rotates between Today's Pick / Random / Recently Viewed.
4. View Transition tile→page morph still works (tap any dish tile, observe the zoom-in transition).
5. Tilt-press on AppBar buttons: pointerdown → 3deg tilt + scale 0.96; release → return.
6. Theme toggle inside More menu: light ↔ dark, page bg flips between #FFFFFF and #000000.
7. Accent picker inside More menu: 4 colors recolor AppList letter headers, active locale tab, active theme tile, AppBar active-indicator (if on home, the home button's underline).
8. Locale switch from More menu: tap `EN` → page goes to English version, persists across navigation.
9. Mobile viewport (414×896 emulation): AppBar fits, buttons reachable with thumb, More menu fits in viewport.
10. `prefers-reduced-motion: reduce`: More menu opens/closes instantly without slide.

If any of the 10 fails, mark which one and surface to the user before merging.

- [ ] **Step 3: Run existing pre-Phase-A probes to catch regressions**

From `site/`:
```bash
node scripts/probe-app-list.mjs
node scripts/probe-cat-tile.mjs
```

(These existed before Phase A+F. They should still pass — if not, Phase A+F broke an unrelated path.)

Expected: both exit 0.

- [ ] **Step 4: Type-check the full site**

From `site/`:
```bash
npx astro check
```

Expected: 0 errors in BaseLayout / Hub / AppListPanel / lib/theme. Pre-existing errors in unrelated files are out of scope.

- [ ] **Step 5: Final commit (if any tweaks were needed during regression sweep)**

If any small fix was needed during Step 2 or 4 (e.g. a typo, a missed selector), commit it:
```bash
git -C "d:/Cantonese Cuisine" add <files>
git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
fix(phase-af): <describe what was fixed during regression sweep>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Otherwise, nothing to commit — Phase A+F is complete.

---

## Self-Review (run after writing this plan)

- ✅ **Spec coverage**: All 5 resolved decisions from §11 land in tasks: accent palette (T4), default Cobalt (T4 + T2 default), full-bar menu width (T8), Random across 66 (T7 step 4), 24px top strip (T6). All `--t-*` and `--accent` tokens covered (T4 + T6). All probes covered (T5, T14, T15). Hub height fix covered (T12). Motion One adoption covered (T1 + T9).
- ✅ **Placeholder scan**: No "TBD", "TODO", "fill in details". All animation timings reference existing tokens (`--fluent-duration-*`) or inline numerical values (0.28 / 0.18 seconds = 280ms/180ms). All commit messages templated with HEREDOC.
- ✅ **Type consistency**: `Theme` / `Accent` types defined in T2, used identically in T9 / T10. `applyTheme` / `applyAccent` / `bootThemeAndAccent` / `toggleTheme` names consistent across tasks. `data-appbar` / `data-theme` / `data-accent-swatch` attributes match between markup (T7, T8) and click handlers (T7, T10).
- ✅ **Order**: T1 (motion install) → T2 (theme module) → T3 (default dark) → T4 (accent var) → T5 (dark probe) → T6 (top strip) → T7 (AppBar) → T8 (menu HTML) → T9 (menu animation) → T10 (menu click wiring) → T11 (AppList accent migrate) → T12 (Hub height fix) → T13 (reduced motion) → T14, T15 (probes) → T16 (regression sweep). Each task is independently committable; Hub visual regression (introduced T6) is closed at T12.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-26-bottom-appbar-and-dark-default-plan.md`.

The user has pre-authorized **subagent-driven execution** for this plan ("sub-agent driven" message, 2026-05-26). Proceed to invoke `superpowers:subagent-driven-development` to dispatch a fresh subagent per task with two-stage review between tasks. No further user approval required for the execution choice.
