# UX visual audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually inspect the site across 96 (theme × accent × viewport × page) cells to surface text-blends-background bugs and adjacent UX issues, producing a triaged punch list.

**Architecture:** A new Playwright probe at `site/scripts/probe-ux-visual.mjs` generates 96 full-page screenshots into `site/audit-output/visual/`. The assistant then reads each screenshot via the Read tool's image mode, groups findings by (page × viewport), and writes `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md` with P0/P1/P2 tagging.

**Tech Stack:** Playwright 1.60 (already installed), Node ES modules. Dev server must be running at `http://localhost:4321/cantopedia/`.

**Spec:** [docs/superpowers/specs/2026-05-26-ux-visual-audit-design.md](../specs/2026-05-26-ux-visual-audit-design.md)

---

## File map

**Created:**
- `site/scripts/probe-ux-visual.mjs` — probe (Task 1)
- `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md` — punch list (Task 3)

**Generated (gitignored):**
- `site/audit-output/visual/{theme}_{accent}_{viewport}_{page}.png` — 96 screenshots
- `site/audit-output/visual/findings.json` — index of (cell → screenshot path)

`.gitignore` already excludes `site/audit-output/` so the `visual/` subdirectory is covered automatically. No gitignore edit needed.

---

## Context the engineer needs

- Dev server: start with `npm run dev` from `site/`. It listens on `http://localhost:4321/cantopedia/`. The probe needs it running.
- Theme switch: add or remove `.dark-side` class on `<html>` and write `localStorage.cantopedia-theme` to `'light'` or `'dark'`. The dark-mode class is the source-of-truth toggle.
- Accent switch: set `[data-accent]` on `<html>` to one of `cobalt`, `red`, `orange`, `emerald`, and write `localStorage.cantopedia-accent` to the same value. The `:root[data-accent="X"]` rules in `site/src/layouts/BaseLayout.astro` lines 495-498 map these to actual hex values.
- Pages to capture per cell:
  - `home`: `/zh`
  - `search-empty`: `/zh/search`
  - `search-results`: `/zh/search?q=chicken`
  - `dish-detail`: discovered at runtime from a `a[href*="/dishes/"]` on home; falls back to a known path if missing
  - `category`: hard-coded `/zh/browse/main` (route file is `site/src/pages/[locale]/browse/[category].astro`; `main` is in the `CategoryId` literal at `pipeline/pipeline/models.py:114-117`)
  - `notfound`: `/zh/this-page-does-not-exist`
- `toUrl()` URL-resolution pattern (regression-tested in last session's `d8cfb10`): if path starts with `http` use as-is; if starts with `/cantopedia` prepend ORIGIN; if starts with `/` prepend `BASE` (which is `ORIGIN + '/cantopedia'`); else treat as BASE-relative.
- Existing probe to use as a reference structure: `site/scripts/probe-ui-audit.mjs`.

---

## Task 1: Create the visual probe

**Files:**
- Create: `site/scripts/probe-ux-visual.mjs`

- [ ] **Step 1: Verify dev server is reachable**

```bash
curl -sf http://localhost:4321/cantopedia/zh > /dev/null && echo OK
```
Expected: `OK`. If not, start `npm run dev` in `site/` and retry. Report BLOCKED if it stays unreachable.

- [ ] **Step 2: Create the probe file**

Create `site/scripts/probe-ux-visual.mjs` with exactly this content:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ORIGIN = 'http://localhost:4321';
const BASE = ORIGIN + '/cantopedia';
const OUT = resolve('audit-output/visual');
mkdirSync(OUT, { recursive: true });

const THEMES = ['light', 'dark'];
const ACCENTS = ['cobalt', 'red', 'orange', 'emerald'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const toUrl = (relOrPath) => {
  if (relOrPath.startsWith('http')) return relOrPath;
  if (relOrPath.startsWith('/cantopedia')) return ORIGIN + relOrPath;
  if (relOrPath.startsWith('/')) return BASE + relOrPath;
  return BASE + '/' + relOrPath;
};

const applyThemeAndAccent = async (p, theme, accent) => {
  await p.evaluate(({ t, a }) => {
    const html = document.documentElement;
    if (t === 'dark') html.classList.add('dark-side');
    else html.classList.remove('dark-side');
    html.setAttribute('data-accent', a);
    try {
      localStorage.setItem('cantopedia-theme', t);
      localStorage.setItem('cantopedia-accent', a);
    } catch {}
  }, { t: theme, a: accent });
  await p.waitForTimeout(200);
};

const browser = await chromium.launch();
const index = [];

// Discover dish-detail href once from home
const discoveryCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const discoveryPage = await discoveryCtx.newPage();
await discoveryPage.goto(`${BASE}/zh`, { waitUntil: 'networkidle', timeout: 15000 });
const dishHrefRaw = await discoveryPage.$eval('a[href*="/dishes/"]', a => a.getAttribute('href')).catch(() => null);
await discoveryCtx.close();

const DISH_PATH = dishHrefRaw || '/cantopedia/zh/dishes/054-ziu1-jim4-haa1';

const PAGES = [
  { name: 'home',           path: '/zh' },
  { name: 'search-empty',   path: '/zh/search' },
  { name: 'search-results', path: '/zh/search?q=chicken' },
  { name: 'dish-detail',    path: DISH_PATH },
  { name: 'category',       path: '/zh/categories/main' },
  { name: 'notfound',       path: '/zh/this-page-does-not-exist' },
];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const p = await ctx.newPage();
  for (const page of PAGES) {
    const url = toUrl(page.path);
    let navOk = true;
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      // 404 path or transient — still want screenshots if DOM rendered
      navOk = false;
    }
    await p.waitForTimeout(300);
    for (const theme of THEMES) {
      for (const accent of ACCENTS) {
        await applyThemeAndAccent(p, theme, accent);
        const file = `${theme}_${accent}_${vp.name}_${page.name}.png`;
        const out = `${OUT}/${file}`;
        await p.screenshot({ path: out, fullPage: true });
        index.push({
          theme, accent, viewport: vp.name, page: page.name,
          url, screenshot: file, navOk,
        });
      }
    }
  }
  await ctx.close();
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify(index, null, 2));
console.log(`Captured ${index.length} screenshots in ${OUT}/`);
console.log(`Index: ${OUT}/findings.json`);
await browser.close();
```

Key implementation choices:
- **Theme/accent applied AFTER page load** (not via cookie before navigation). This is intentional: client-side theme bootstrap runs early, but applying after `networkidle` + 300ms gives the page a chance to settle. Then theme/accent flip is fast (no full reload) — only DOM attribute changes.
- **Page navigation happens ONCE per page**, then we cycle through 8 (theme × accent) variants on the same page state. Saves ~6× page load cost (8 vs 1 nav per page).
- **`fullPage: true`** captures the entire scrollable area. Long pages (dish-detail) produce tall PNGs — that's the spec.
- **Dish-detail discovery** runs once in a throwaway context, then is shared across all (vp × theme × accent) iterations.

- [ ] **Step 3: Run the probe**

```bash
cd site && node scripts/probe-ux-visual.mjs
```

Expected: `Captured 96 screenshots in ...`. The run takes ~3-6 minutes (96 screenshots × ~2-4s each + page navigations).

If the count is not exactly 96, debug. Off-by-N usually means one page failed to navigate (errored URL, hang) — the probe's `try/catch` around `goto` should let it continue, but verify by listing files:

```bash
ls site/audit-output/visual/*.png | wc -l
```

Expected: `96`.

- [ ] **Step 4: Sanity check a few screenshots**

```bash
ls site/audit-output/visual/ | head -10
```

Confirm filenames follow the `{theme}_{accent}_{viewport}_{page}.png` pattern.

Open ONE sample manually to confirm it's a real page render, not a blank page:

```bash
file site/audit-output/visual/dark_cobalt_desktop_home.png
```

Expected: PNG image data, dimensions reasonable (e.g. 1280×N where N ≥ 800).

If the file is a fraction of expected size (e.g. <10KB), the page likely failed to render and you got a blank — investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/probe-ux-visual.mjs
git commit -m "test(probe): add UX visual audit probe (96-cell screenshot matrix)

Drives docs/handoff/UX_VISUAL_AUDIT_*.md. Captures 2 themes × 4 accents
× 2 viewports × 6 pages full-page screenshots into audit-output/visual/.
Theme/accent applied via DOM + localStorage after network idle so we
get one page-load per (viewport × page) and cycle 8 variants on top.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Verify the probe output is reviewable

**Files:** (no edits — verification only)

- [ ] **Step 1: Spot-check screenshot quality**

Open these specific screenshots via the Read tool (image mode):
- `site/audit-output/visual/light_cobalt_desktop_home.png`
- `site/audit-output/visual/dark_cobalt_desktop_home.png`
- `site/audit-output/visual/light_red_mobile_dish-detail.png`
- `site/audit-output/visual/dark_emerald_mobile_search-results.png`

For each, confirm:
- The image renders successfully (not an error).
- The accent color is visibly different in the relevant chrome (footer stripe, focused input border, etc.).
- The theme dichotomy is obvious (dark = dark background, light = light background).
- Page content actually rendered (not a blank page or error overlay).

If any sample shows a blank page or the theme/accent didn't apply, the probe has a bug — fix it, re-run, recommit (`git commit --amend` is acceptable here since the bad commit hasn't been pushed yet).

- [ ] **Step 2: Inspect findings.json**

```bash
cd site && node -e "const f = JSON.parse(require('fs').readFileSync('audit-output/visual/findings.json', 'utf8')); console.log('Total cells:', f.length); console.log('Pages:', [...new Set(f.map(x => x.page))].join(', ')); console.log('Themes:', [...new Set(f.map(x => x.theme))].join(', ')); console.log('Accents:', [...new Set(f.map(x => x.accent))].join(', ')); console.log('Viewports:', [...new Set(f.map(x => x.viewport))].join(', ')); console.log('Nav failures:', f.filter(x => !x.navOk).length);"
```

Expected output:
```
Total cells: 96
Pages: home, search-empty, search-results, dish-detail, category, notfound
Themes: light, dark
Accents: cobalt, red, orange, emerald
Viewports: desktop, mobile
Nav failures: <expected 12 (the 6 notfound × 2 viewports — notfound triggers a 404 which throws on networkidle wait, but the screenshot still captures)>
```

If `Nav failures` is much higher than 12, some legitimate pages failed to navigate — investigate.

- [ ] **Step 3: No commit needed** — Task 2 is verification only. The probe is what's tracked.

---

## Task 3: Visual review + write punch list

**Files:**
- Create: `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md`

This is the assistant's core deliverable. Look at every screenshot or representative samples, identify legibility / contrast / UX bugs, and write them up.

- [ ] **Step 1: Plan the review batches**

Group the 96 screenshots by `(page, viewport)` — 12 groups of 8 (4 accents × 2 themes per group). Within each group, the comparison points are:

- Light vs dark (same accent, same viewport, same page)
- Across accents (same theme, same viewport, same page)

Review order (suggestion):
1. `home_desktop` → 8 shots
2. `home_mobile` → 8 shots
3. `search-empty_desktop` → 8 shots
4. `search-empty_mobile` → 8 shots
5. `search-results_desktop` → 8 shots
6. `search-results_mobile` → 8 shots
7. `dish-detail_desktop` → 8 shots
8. `dish-detail_mobile` → 8 shots
9. `category_desktop` → 8 shots
10. `category_mobile` → 8 shots
11. `notfound_desktop` → 8 shots
12. `notfound_mobile` → 8 shots

For each group, open all 8 screenshots via Read (image mode), one after another, in a single tool batch where possible so they're in your visual working memory simultaneously.

- [ ] **Step 2: For each group, look for**

1. **Text-blends-into-background** (the originating concern):
   - Body copy, headings, labels, button text — does any of it become unreadable in any cell?
   - Input contents (search query "chicken", focused inputs)?
   - State indicators (active tabs, hover styles visible in static renders)?
2. **Accent text readability**: any element using `--accent` color for text — is contrast sufficient in all 4 accent × 2 theme combos? Pay attention to emerald (#008A00) on dark, orange (#FA6800) on light.
3. **Overlays**: any text on `--acrylic-noise` / blurred / semi-transparent backgrounds?
4. **Image-text overlap**: text overlapping hero images, featured tiles, etc.
5. **Incidental UX bugs** spotted along the way: alignment, clipping, broken images, misaligned icons, z-index hops.

For each finding, capture:
- Severity (P0 = unreadable / unusable, P1 = visible regression, P2 = nit/polish)
- Which specific cells exhibit it (e.g. "dark × all accents × both viewports × home")
- One-sentence description + likely root cause if obvious

- [ ] **Step 3: Write `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md`**

Use this exact structure:

```markdown
# UX Visual Audit — 2026-05-26

**Source data:** `site/audit-output/visual/` (gitignored; rerun via `node scripts/probe-ux-visual.mjs`)
**Matrix:** 2 themes × 4 accents × 2 viewports × 6 pages = 96 screenshots
**Locale:** zh

## Summary

- Total screenshots reviewed: 96
- P0 findings: <N>
- P1 findings: <N>
- P2 findings: <N>

## Findings

### P0 — blockers (text unreadable, feature unusable)

<one bullet per finding, format below, or `- _None._`>

### P1 — visible regressions (low contrast, text blends, distracting)

<one bullet per finding>

### P2 — nits (subtle, polish, suggestion)

<one bullet per finding>

## Out-of-band observations

<anything else worth noting that doesn't fit P0/P1/P2; can be omitted>
```

Bullet format per finding:

```
- **<theme> × <accent(s)> × <viewport(s)> × <page> — <short title>.** Evidence: `<screenshot1.png>`, `<screenshot2.png>`. Description: <one sentence>. Likely cause: <file:line if confident, else "needs devtools repro">.
```

- [ ] **Step 4: Commit**

```bash
cd "d:/Cantonese Cuisine"
mkdir -p docs/handoff
git add docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md
git commit -m "docs(handoff): UX visual audit punch list 2026-05-26

96-cell visual sweep (2 themes × 4 accents × 2 viewports × 6 pages,
zh). Tagged P0/P1/P2 with per-cell screenshot evidence. Fixes are
negotiated case-by-case after this list lands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Report back**

Surface the audit doc to the user in chat. Quote the per-priority counts. Surface the top 3-5 most concerning findings in plain English. Do NOT start fixing audit findings without explicit go-ahead — per spec §Non-goals.

---

## Done criteria

- [ ] `site/audit-output/visual/` contains 96 PNGs + `findings.json` (gitignored).
- [ ] `git log --oneline -3` shows: probe commit → punch list commit (Task 2 has no commit).
- [ ] `docs/handoff/UX_VISUAL_AUDIT_2026-05-26.md` exists with P0/P1/P2 sections (any of which may be `_None._`) and references screenshot evidence for each finding.
- [ ] The findings can be acted on without re-running the probe (filenames are self-describing).
