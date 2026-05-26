# Color consistency cleanup + UI bug audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate interactive `--m-red` usages to `--accent` (preserving brand-fixed reds), fix HubPivot mobile chevron tap targets WP10-style, then run a Playwright UI audit to produce a triaged punch list.

**Architecture:** CSS-only edits to three Astro files. A new Playwright probe asserts computed styles across all four accent settings (cobalt / red / orange / emerald) — it acts as the "test" for the color-token migration. A second probe drives the audit (desktop + mobile screenshots across key pages) and outputs a Markdown punch list.

**Tech Stack:** Astro 5, Playwright 1.60 (already installed), Node ES modules. Dev server: `npm run dev` in `site/`, runs at `http://localhost:4321/cantopedia/...` (base path is `cantopedia`).

**Spec:** [docs/superpowers/specs/2026-05-26-color-consistency-and-bug-audit-design.md](../specs/2026-05-26-color-consistency-and-bug-audit-design.md)

---

## File map

**Modified:**
- `site/src/pages/[locale]/search.astro` (line 121)
- `site/src/layouts/BaseLayout.astro` (lines 896, 936, 939, 1092)
- `site/src/components/HubPivot.astro` (lines 84-87, mobile breakpoint)

**Created:**
- `site/scripts/probe-color-consistency.mjs` — verification probe (Parts 1+2)
- `site/scripts/probe-ui-audit.mjs` — audit driver
- `docs/handoff/UI_AUDIT_2026-05-26.md` — audit punch list output

---

## Background context for the engineer

**Accent vs. brand red:**
- `--m-red` (`#e51400`) is the fixed Metro brand red.
- `--accent` is user-themeable. Set via `[data-accent]` on `<html>`. Four values: `cobalt` (`#0078D7`), `red` (`#E51400`), `orange` (`#F7630C`), `emerald` (`#00B294`). Persisted to `localStorage` key `cantopedia-accent`. See `BaseLayout.astro` around lines 89, 342, 496.
- Test note: when accent = `red`, the migrated elements visually look unchanged (both are `#E51400`). Always test with a non-red accent (e.g. `cobalt`) to verify the migration actually worked.

**Probe pattern:**
- Probes live in `site/scripts/probe-*.mjs`. Run with `node scripts/probe-<name>.mjs` from inside `site/`.
- Use `import { chromium } from 'playwright'`.
- Always use `waitUntil: 'networkidle'` after navigation, plus a short `waitForTimeout(300)` to let JS apply attributes.
- See [site/scripts/probe-theme-truth.mjs](../../site/scripts/probe-theme-truth.mjs) for reference structure.

**Dev server must be running** at `http://localhost:4321/cantopedia/` during probe runs. Start it in a separate terminal with `npm run dev` from `site/`.

---

## Task 1: Add color-consistency verification probe (will fail initially)

**Files:**
- Create: `site/scripts/probe-color-consistency.mjs`

This probe is our test harness for Parts 1+2 of the spec. We write it first so we have evidence the current code is broken (Part 1.A/B + Part 2 fail for non-red accents). Each subsequent fix flips one assertion from FAIL to PASS.

- [ ] **Step 1: Start the dev server in a separate terminal**

```bash
cd site && npm run dev
```

Confirm the server is reachable: `curl -sf http://localhost:4321/cantopedia/zh > /dev/null && echo OK`. Expected: `OK`.

- [ ] **Step 2: Create the probe file**

`site/scripts/probe-color-consistency.mjs`:

```js
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321/cantopedia';

// Expected accent hex per data-accent value (mirrors BaseLayout.astro :root[data-accent="..."] rules)
const ACCENT_HEX = {
  cobalt:  '#0078D7',
  red:     '#E51400',
  orange:  '#F7630C',
  emerald: '#00B294',
};

const norm = (rgb) => {
  // rgb(R, G, B) → #RRGGBB uppercase
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return '#' + m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const setAccent = async (p, accent) => {
  await p.evaluate((a) => {
    document.documentElement.setAttribute('data-accent', a);
    try { localStorage.setItem('cantopedia-accent', a); } catch {}
  }, accent);
  await p.waitForTimeout(150);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();

const results = [];
const assert = (label, expected, actual) => {
  const ok = expected.toUpperCase() === actual.toUpperCase();
  results.push({ label, expected, actual, ok });
};

for (const accent of Object.keys(ACCENT_HEX)) {
  const want = ACCENT_HEX[accent];

  // Home page — assert footer stripe + a:hover-via-computed-style + pivot-tab.active::after
  await p.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
  await setAccent(p, accent);

  // Part 1.B — footer::before stripe background
  const footerStripeBg = await p.evaluate(() => {
    const el = document.querySelector('footer');
    if (!el) return null;
    return getComputedStyle(el, '::before').backgroundColor;
  });
  if (footerStripeBg) assert(`[${accent}] footer::before bg`, want, norm(footerStripeBg));

  // Part 2 — .pivot-tab.active::after background (top-bar active tab underline)
  const activeUnderlineBg = await p.evaluate(() => {
    const el = document.querySelector('.pivot-tab.active');
    if (!el) return null;
    return getComputedStyle(el, '::after').backgroundColor;
  });
  if (activeUnderlineBg) assert(`[${accent}] .pivot-tab.active::after bg`, want, norm(activeUnderlineBg));

  // Part 2 — a:hover color (force :hover via pseudo-class can't be tested directly,
  // so we read the rule's resolved color by temporarily forcing hover via JS)
  const aHoverColor = await p.evaluate(() => {
    const a = document.querySelector('main a, footer a');
    if (!a) return null;
    // Read the :hover declared color from matched CSS rules
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        if (rule.selectorText === 'a:hover' || rule.selectorText === 'footer a:hover') {
          const c = rule.style.color;
          if (c) return c;
        }
      }
    }
    return null;
  });
  if (aHoverColor) {
    // The CSSOM may return the var(--m-red) or var(--accent) declaration string —
    // resolve it by setting it as inline color on a probe element and reading computed.
    const resolved = await p.evaluate((decl) => {
      const probe = document.createElement('span');
      probe.style.color = decl;
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, aHoverColor);
    assert(`[${accent}] a:hover color`, want, norm(resolved));
  }

  // Search page — assert .search-input:focus border-color (Part 1.A)
  await p.goto(`${BASE}/zh/search`, { waitUntil: 'networkidle' });
  await setAccent(p, accent);
  const input = await p.$('.search-input');
  if (input) {
    await input.focus();
    await p.waitForTimeout(150);
    const borderColor = await p.evaluate(() => {
      const el = document.querySelector('.search-input');
      return el ? getComputedStyle(el).borderColor : null;
    });
    if (borderColor) assert(`[${accent}] .search-input:focus border`, want, norm(borderColor));
  }
}

// Brand-fixed sanity: brand-seal should stay red regardless of accent
await p.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
await setAccent(p, 'cobalt');
const sealBg = await p.evaluate(() => {
  const el = document.querySelector('.brand-seal');
  return el ? getComputedStyle(el).backgroundColor : null;
});
if (sealBg) assert(`[cobalt] .brand-seal stays brand red`, '#E51400', norm(sealBg));

console.log(JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
```

- [ ] **Step 3: Run the probe — verify it FAILS as expected**

```bash
cd site && node scripts/probe-color-consistency.mjs
```

Expected: exits with code 1. For accents `cobalt`, `orange`, `emerald`, assertions for `footer::before bg`, `.pivot-tab.active::after bg`, `a:hover color`, and `.search-input:focus border` should report `expected: #0078D7 / #F7630C / #00B294` but `actual: #E51400`. The brand-seal assertion should PASS. The `red` accent rows should all PASS (degenerate case — both colors happen to be `#E51400`).

If the probe errors instead of failing assertions, fix the probe before continuing.

- [ ] **Step 4: Commit the probe**

```bash
git add site/scripts/probe-color-consistency.mjs
git commit -m "test(probe): add color consistency probe for --m-red → --accent migration

Asserts focus border, footer stripe, pivot tab underline, and global a:hover
follow --accent across all four accent settings, while brand-seal stays
fixed Metro red. Currently failing — drives the fixes in subsequent commits."
```

---

## Task 2: Fix search input focus border (Part 1.A)

**Files:**
- Modify: `site/src/pages/[locale]/search.astro:121`

- [ ] **Step 1: Apply the edit**

In `site/src/pages/[locale]/search.astro`, line 121:

```diff
-  .search-input:focus { border-color: var(--m-red); background: var(--t-ink); color: #fff; }
+  .search-input:focus { border-color: var(--accent); background: var(--t-ink); color: #fff; }
```

- [ ] **Step 2: Re-run the probe — `.search-input:focus border` assertions should now PASS**

```bash
cd site && node scripts/probe-color-consistency.mjs
```

Expected: rows labeled `[cobalt|red|orange|emerald] .search-input:focus border` all OK. Other previously-failing rows still fail. Probe exit code still 1.

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/[locale]/search.astro
git commit -m "fix(search): focus border follows --accent, not fixed Metro red

Interactive focus indicator is a personalization affordance per WP10
system-color guidance, not brand identity."
```

---

## Task 3: Fix footer stripe + accent sweep in BaseLayout (Part 1.B + Part 2)

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro` (lines 896, 936, 939, 1092)

These four edits all live in `BaseLayout.astro` and share the same rationale (interactive / state colors follow accent). Bundle them in one commit.

- [ ] **Step 1: Apply edit — `a:hover` (line 896)**

```diff
-      a:hover { color: var(--m-red); }
+      a:hover { color: var(--accent); }
```

- [ ] **Step 2: Apply edit — footer left stripe (line 936)**

```diff
       footer::before {
         content: '';
         position: absolute;
         left: 1.5rem; top: 1.75rem; bottom: 2rem;
         width: 3px;
-        background: var(--m-red);
+        background: var(--accent);
       }
```

- [ ] **Step 3: Apply edit — `footer a:hover` (line 939)**

```diff
-      footer a:hover { color: var(--m-red) !important; }
+      footer a:hover { color: var(--accent) !important; }
```

- [ ] **Step 4: Apply edit — `.pivot-tab.active::after` underline (line 1092)**

```diff
       .pivot-tab.active::after {
         content: '';
         position: absolute;
         left: 0.6rem; right: 0.6rem;
         bottom: 0.35rem;
         height: 2px;
-        background: var(--m-red);
+        background: var(--accent);
       }
```

- [ ] **Step 5: Re-run probe — all color assertions should now PASS**

```bash
cd site && node scripts/probe-color-consistency.mjs
```

Expected: exit code 0. All assertions OK, including the brand-seal sanity row.

If the brand-seal row fails (i.e. it accidentally turned cobalt), you over-shot — `--m-red` references at lines 907 (`.badge--seal`), 1065 (`.brand-seal`), 27 + 62 in `MetroEmptyState.astro` MUST remain unchanged. Revert and re-edit only the four lines listed above.

- [ ] **Step 6: Commit**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "fix(theme): interactive --m-red usages follow --accent (WP10 system color)

Migrates a:hover, footer::before stripe, footer a:hover, and the
.pivot-tab.active underline indicator to --accent. Brand-identity reds
(brand-seal, badge--seal, MetroEmptyState tile) stay fixed Metro red."
```

---

## Task 4: Fix HubPivot mobile chevron tap targets (Part 1.C)

**Files:**
- Modify: `site/src/components/HubPivot.astro` (lines 84-87)

- [ ] **Step 1: Apply the edit**

In `site/src/components/HubPivot.astro`, replace the mobile media query block (lines 84-87):

```diff
   @media (max-width: 540px) {
-    .hub-pivot { min-height: 3.5rem; padding: var(--sp-3) var(--sp-4) var(--sp-1); }
-    .hub-pivot-peek { display: none; }
+    .hub-pivot {
+      min-height: 3.5rem;
+      padding: var(--sp-3) var(--sp-4) var(--sp-1);
+      gap: var(--sp-3);
+    }
+    .hub-pivot-link {
+      padding: var(--sp-3) var(--sp-2);
+      min-width: 44px;
+      min-height: 44px;
+      justify-content: center;
+    }
+    .hub-pivot-arrow {
+      font-size: var(--fs-h2);
+    }
+    .hub-pivot-peek { display: none; }
   }
```

WP10 principle: chevrons stay chrome-less — no background, no border, no rounded button look. The 44×44 tap area is achieved via *transparent* padding on the `<button>`.

- [ ] **Step 2: Add a HubPivot mobile assertion to the probe**

Append the following block to `site/scripts/probe-color-consistency.mjs`, just before the final `console.log(JSON.stringify(results...` line:

```js
// Part 1.C — HubPivot mobile chevron tap target ≥ 44×44
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mobileCtx.newPage();
// Find a dish detail page (HubPivot only renders where there's prev/next)
await mp.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
const dishHref = await mp.$eval('a[href*="/dishes/"]', a => a.getAttribute('href')).catch(() => null);
if (dishHref) {
  await mp.goto(new URL(dishHref, BASE).href, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(200);
  const dims = await mp.evaluate(() => {
    const btn = document.querySelector('.hub-pivot-link');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  if (dims) {
    results.push({
      label: '[mobile] .hub-pivot-link width ≥ 44',
      expected: '≥ 44',
      actual: String(dims.w),
      ok: dims.w >= 44,
    });
    results.push({
      label: '[mobile] .hub-pivot-link height ≥ 44',
      expected: '≥ 44',
      actual: String(dims.h),
      ok: dims.h >= 44,
    });
  }
}
await mobileCtx.close();
```

- [ ] **Step 3: Re-run the probe — mobile assertions should PASS**

```bash
cd site && node scripts/probe-color-consistency.mjs
```

Expected: exit code 0. Two new rows `[mobile] .hub-pivot-link width/height ≥ 44` report OK.

- [ ] **Step 4: Take a mobile screenshot for visual sanity (optional but recommended)**

Quick one-off to eyeball the chevron sizing — run this inline:

```bash
cd site && node -e "
import('playwright').then(async ({ chromium }) => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
  const href = await p.\$eval('a[href*=\"/dishes/\"]', a => a.getAttribute('href'));
  await p.goto(new URL(href, 'http://localhost:4321/cantopedia/').href, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/hubpivot-mobile.png', fullPage: false });
  await b.close();
  console.log('Saved /tmp/hubpivot-mobile.png');
});
"
```

Open the screenshot and confirm: chevrons look meaningfully larger than before, sit a comfortable distance from the viewport edge, no visible button background/border.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/HubPivot.astro site/scripts/probe-color-consistency.mjs
git commit -m "fix(hubpivot): mobile chevrons get WP10-style invisible 44x44 tap zone

Adds transparent padding to the prev/next buttons so the tap target meets
WP10 touch-target guidance (~9mm = 44px), while keeping chrome-less
WP10 typography (no button background, no border, font-weight: Light).
Glyph size bumped to --fs-h2."
```

---

## Task 5: Add the UI audit probe

**Files:**
- Create: `site/scripts/probe-ui-audit.mjs`

This probe drives the audit. It does not assert pass/fail — it collects evidence (screenshots, console errors, network failures, horizontal-overflow flag) and writes a JSON dump for the human to read.

- [ ] **Step 1: Create the probe**

`site/scripts/probe-ui-audit.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = 'http://localhost:4321/cantopedia';
const OUT = resolve('audit-output');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const PAGES_BY_LOCALE = (locale) => [
  { name: 'home',           path: `/${locale}` },
  { name: 'search-empty',   path: `/${locale}/search` },
  { name: 'search-results', path: `/${locale}/search?q=chicken` }, // adjust q if no results
  { name: 'notfound',       path: `/${locale}/this-page-does-not-exist` },
];

const browser = await chromium.launch();
const findings = [];

for (const vp of VIEWPORTS) {
  for (const locale of ['zh', 'en', 'yue']) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();
    const consoleErrors = [];
    const netFails = [];
    p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    p.on('response', (r) => { if (r.status() >= 400) netFails.push({ url: r.url(), status: r.status() }); });

    // Resolve a sample dish + category once per (vp, locale) by reading any link on home
    await p.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    const sampleDish = await p.$eval('a[href*="/dishes/"]', a => a.getAttribute('href')).catch(() => null);
    const sampleCat  = await p.$eval('a[href*="/categories/"]', a => a.getAttribute('href')).catch(() => null);

    const targets = [
      ...PAGES_BY_LOCALE(locale),
      ...(sampleDish ? [{ name: 'dish-detail', path: sampleDish.replace(/^.*\/cantopedia/, '') }] : []),
      ...(sampleCat  ? [{ name: 'category',    path: sampleCat.replace(/^.*\/cantopedia/, '')  }] : []),
    ];

    for (const t of targets) {
      consoleErrors.length = 0;
      netFails.length = 0;
      try {
        await p.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await p.waitForTimeout(300);
      } catch (e) {
        findings.push({ vp: vp.name, locale, page: t.name, path: t.path, error: String(e) });
        continue;
      }
      const overflow = await p.evaluate(() => document.body.scrollWidth > window.innerWidth);
      const overflowAmount = await p.evaluate(() => document.body.scrollWidth - window.innerWidth);
      const shotPath = `${OUT}/${vp.name}_${locale}_${t.name}.png`;
      await p.screenshot({ path: shotPath, fullPage: true });
      findings.push({
        vp: vp.name,
        locale,
        page: t.name,
        path: t.path,
        screenshot: shotPath,
        consoleErrors: [...consoleErrors],
        netFails: [...netFails],
        horizontalOverflow: overflow,
        overflowAmountPx: overflowAmount,
      });
    }
    await ctx.close();
  }
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(`Wrote ${findings.length} findings to ${OUT}/findings.json`);
console.log(`Screenshots in ${OUT}/`);
await browser.close();
```

- [ ] **Step 2: Run the probe**

```bash
cd site && node scripts/probe-ui-audit.mjs
```

Expected: writes `site/audit-output/findings.json` plus a PNG per (viewport × locale × page) combination. No exit-code assertion — this is data collection, not a test.

- [ ] **Step 3: Skim findings.json — confirm reasonable shape**

```bash
cd site && node -e "const f = JSON.parse(require('fs').readFileSync('audit-output/findings.json', 'utf8')); console.log('Total:', f.length); console.log('With console errors:', f.filter(x => x.consoleErrors.length).length); console.log('With net fails:', f.filter(x => x.netFails.length).length); console.log('With horizontal overflow:', f.filter(x => x.horizontalOverflow).length);"
```

If the totals look implausible (e.g. zero pages screenshotted, or all pages erroring), debug the probe before continuing.

- [ ] **Step 4: Commit the probe (but gitignore the output)**

```bash
echo "site/audit-output/" >> .gitignore
git add .gitignore site/scripts/probe-ui-audit.mjs
git commit -m "test(probe): add UI audit probe — desktop+mobile, all locales, key pages

Collects screenshots, console errors, network failures, and horizontal-
overflow flag into site/audit-output/. Drives docs/handoff/UI_AUDIT_*.md."
```

(If `.gitignore` already excludes `site/audit-output/` or the working tree is clean for the probe-script change, omit the `.gitignore` edit from the commit.)

---

## Task 6: Triage audit findings into the punch list

**Files:**
- Create: `docs/handoff/UI_AUDIT_2026-05-26.md`

This is a human review task — the engineer looks through `site/audit-output/findings.json` + the screenshots and writes a triaged document. The plan defines the format precisely so the output is consistent.

- [ ] **Step 1: Read every screenshot and the findings.json entry alongside it**

For each (viewport × locale × page) combination:
- Open the PNG.
- Note anything that looks wrong: layout shifts, text clipped, images broken, theme inconsistencies, alignment off, overflow.
- Check the matching JSON entry for `consoleErrors`, `netFails`, `horizontalOverflow`.

- [ ] **Step 2: Write the punch-list document**

Create `docs/handoff/UI_AUDIT_2026-05-26.md` with this exact structure:

```markdown
# UI Audit — 2026-05-26

**Source data:** `site/audit-output/` (gitignored; rerun via `node scripts/probe-ui-audit.mjs`)
**Viewports:** desktop 1280×800, mobile 390×844 (iPhone 14)
**Locales:** zh, en, yue
**Pages:** home, search-empty, search-results, dish-detail, category, notfound

## Summary

- Total page-viewport combinations: <fill in>
- With console errors: <fill in>
- With network failures: <fill in>
- With horizontal overflow: <fill in>

## Findings

### P0 — blockers (broken feature, console error spam, can't navigate)

<one bullet per finding, format:>
- **[viewport][locale] page — short title.** Evidence: `screenshot.png` / specific JSON path. Notes: <what's wrong, optional reproduction>.

If no P0 findings: write `- _None._`

### P1 — visible regressions (layout glitch, theme inconsistency, broken image)

<same format>

### P2 — nits (cosmetic, suggestion, low-impact)

<same format>

## Out-of-band observations

<Anything that doesn't fit P0/P1/P2 — performance feel, content suggestions, etc. Optional section, can be omitted.>
```

- [ ] **Step 3: Commit the punch list**

```bash
git add docs/handoff/UI_AUDIT_2026-05-26.md
git commit -m "docs(handoff): UI audit punch list 2026-05-26

Triaged findings from probe-ui-audit run across desktop+mobile and all
three locales. Each item tagged P0/P1/P2 with screenshot evidence."
```

- [ ] **Step 4: Report back to the user**

Surface the punch list in chat. Quote the per-priority counts. Ask which items to fix in this session vs. defer. Do NOT start fixing audit findings without explicit go-ahead — Part 3 of the spec is explicit that the audit *produces* the list; fixes are negotiated case-by-case.

---

## Done criteria

- [ ] `node scripts/probe-color-consistency.mjs` exits 0 (all assertions PASS).
- [ ] `git log --oneline -6` shows the six commits in order: probe added → search fix → BaseLayout sweep → HubPivot mobile fix → audit probe added → punch list.
- [ ] `docs/handoff/UI_AUDIT_2026-05-26.md` exists, has P0/P1/P2 sections (any of which may be `_None._`), and references screenshot evidence for each finding.
- [ ] Open `site/audit-output/mobile_zh_dish-detail.png` and visually confirm the HubPivot chevrons look comfortable — not stuck to edge, easy to tap.
