# Dark Mode via Metro `.dark-side` — Design

**Date:** 2026-05-26
**Status:** Draft (revision 2, post-ultrathink audit), pending user review
**Repo:** Cantopedia 粵食典
**Branch base:** `feat/wp10-metroui`

## Problem

Current dark-mode implementation has four manifestations of a single root cause: our `--t-*` token system writes `--body-background: var(--t-bg)` without `!important`, but Metro UI (loaded after) re-asserts `:root { --body-background: var(--default-background) }` at the same specificity and wins. The `<html>` element switches color correctly, but `<body>` stays white forever.

Evidence ([site/scripts/probe-theme-truth.mjs](../../../site/scripts/probe-theme-truth.mjs), 2026-05-26):

| Bug | Probe data |
|---|---|
| 1. `<body>` stays white in dark mode | `bodyBg: "rgb(255,255,255)"` in all 5 page states; `--body-background: #fff` regardless of `data-theme` |
| 2. No theme toggle off home | dish page reports 1 orphan button with `pressed=null` (view-transition stale fragment); the real Hub utility row is home-only |
| 3. FOUC on initial load, on toggle, on ClientRouter swap | Inline `<script data-astro-rerun>` runs but only sets `data-theme` dataset, not the class Metro's tokens key off |
| 4. Multiple elements don't follow theme | False alarm: all "broken" elements are brand-fixed surfaces (nav black, footer black, hero overlay black, tile branded). Once `--body-background` switches, every `var(--t-bg)` consumer follows automatically |

The earlier hack — adding `!important` in commit `3e4128f` — was removed during the B7 token-discipline refactor and shouldn't return. The right fix is to **let Metro drive the dark token values** via its native `.dark-side` class selector, and alias our `--t-*` tokens to Metro's already-defined tokens.

Auto-mode is dropped entirely. WP10 Settings is 2-state (Light / Dark); "Auto" is not WP10 vernacular.

## Goals

1. **Single source of truth for dark state**: the `<html>.dark-side` class. Metro v5's [base-theme.less](../../../site/node_modules/@olton/metroui/source/common-css/base-theme.less) defines the `.dark-side` token block. Our code only adds / removes the class.
2. **2-state theme**: Light / Dark only. Drop `auto`, drop `prefers-color-scheme` listener, drop `dict.auto`.
3. **Global toggle access**: theme toggle on every page (nav app-bar) and on home (Hub Start Menu utility row).
4. **Zero hardcoded site-code change**: `--t-*` tokens alias to Metro's `--body-background` / `--body-color` / `--border-color` / `--default-background-disabled`. Existing `var(--t-bg)` consumers (Hub, Pivot, dish page, applist) auto-follow.
5. **Zero FOUC across all three scenarios**: initial page load, toggle interaction, ClientRouter cross-page navigation.
6. **WP10 vernacular** for all toggle UI: rectangular 1×1 tiles with `mif-sunny` / `mif-moon-right` icons (Hub), small command icon button (nav). No emoji symbols, no circular FAB, no iOS-style switch.

## Non-Goals

- No use of Metro's `theme-switcher` plugin. Audit (see Appendix A) found three blockers: (1) renders ☀/☾ emoji on 36×36 circular button — non-WP10 visual; (2) `_observeClass` MutationObserver never `disconnect()`s in `destroy()`, leaks per ClientRouter swap; (3) `Metro.storage` JSON-encodes values and prefixes localStorage keys with `:`, creating data-loss risk when migrating from our existing `cantopedia-theme` key.
- No change to brand-fixed dark surfaces (nav, footer, tile palette, hero overlay) — these are always dark by design and must not respond to theme.
- No CSS transition on `--body-background` change — WP10 vernacular = instant switch.
- No View Transitions API hook for the toggle interaction. Cross-page nav still goes through Astro's built-in ClientRouter view-transitions; theme state is preserved via a `before-swap` hook, not via animated morph.
- No backwards compatibility for the old `auto` localStorage value — first load after deploy treats `auto` as light (per migration step in §Architecture).
- No new dependency.
- No migration of the brand `--m-*` palette (red / green / blue / orange / steel etc.).

## Architecture

### Token alias chain — direction reversed

Metro v5 already defines, in [base-theme.less:22-57](../../../site/node_modules/@olton/metroui/source/common-css/base-theme.less#L22):

```css
:root {
    --default-background: #fff;
    --default-color: #191919;
    --default-background-disabled: #f7f8fa;
    --body-background: var(--default-background);
    --body-color: var(--default-color);
    --border-color: #e8e8e8;
}
.dark-side {
    --default-background: #1e1f22;
    --default-color: #dbdfe7;
    --default-background-disabled: #343637;
    --body-background: var(--default-background);
    --body-color: var(--default-color);
    --border-color: #4a4d51;
}
body {
    background-color: var(--body-background);
    color: var(--body-color);
}
```

Crucially, Metro **already applies** `--body-background` and `--body-color` directly to `body` (line 59-62). The moment `.dark-side` is on `<html>`, `body` flips. Our code does **not** need to write any `body { background: ... }` rule.

Our addition in [BaseLayout.astro `:root`](../../../site/src/layouts/BaseLayout.astro#L290):

```css
:root {
  /* --t-* aliases forward to Metro tokens. The arrows reverse the old direction:
     previously --t-bg was the source, --body-background the consumer (which Metro
     would re-override). Now Metro is the source and --t-bg pulls from it. */
  --t-bg: var(--body-background);
  --t-ink: var(--body-color);
  --t-rule: var(--border-color);
  --t-plate: var(--default-background-disabled);

  /* Tokens with no Metro equivalent — keep as literal light-mode values here */
  --t-plate-dark: #cccccc;
  --t-card: #ffffff;
  --t-ink-dim: #555;
  --t-nav-bg: rgba(29, 29, 29, 0.72);  /* brand-fixed, no .dark-side override */
  --t-nav-ink: #ffffff;                /* brand-fixed (nav always dark, ink always white) */
}
.dark-side {
  --t-plate-dark: #25252a;
  --t-card: #161618;
  --t-ink-dim: #9a9a9a;
  /* --t-nav-bg intentionally omitted: nav is brand-fixed (always dark) */
}
```

The existing `html[data-theme="dark"] { /* 9 token overrides */ }` block at [BaseLayout.astro:423](../../../site/src/layouts/BaseLayout.astro#L423) shrinks to the 3-token `.dark-side` block above. The other 6 (`--t-bg / --t-ink / --t-rule / --t-plate / --t-nav-bg / --t-ink-dim`) are alias-driven or brand-fixed.

### Toggle UI — hand-written, WP10-faithful

Two toggle locations, **both hand-written** for visual fidelity. No Metro plugin (see Non-Goals + Appendix A).

**Location A — Hub Start Menu utility row** ([Hub.astro:251-258](../../../site/src/components/Hub.astro#L251)):

Replace the existing 3 buttons (`light` / `dark` / `auto`) with **2 buttons** (`light` / `dark`). Same `tile-small wp-tile util-tile` markup; same `mif-sunny` / `mif-moon-right` icons; same brand colors (`--m-yellow` for light, `--m-purple` for dark). Just delete the auto button.

```astro
<button type="button" class="tile-small wp-tile util-tile"
        data-role="tile" data-size="small"
        data-theme="light" style="background: var(--m-yellow);"
        aria-label={dict.theme_light ?? 'Light theme'}>
  <span class="mif-sunny util-icon"></span>
</button>
<button type="button" class="tile-small wp-tile util-tile"
        data-role="tile" data-size="small"
        data-theme="dark" style="background: var(--m-purple);"
        aria-label={dict.theme_dark ?? 'Dark theme'}>
  <span class="mif-moon-right util-icon"></span>
</button>
```

Note: attribute renamed from `data-theme-choice` to `data-theme` to keep selector vocabulary aligned with how the rest of the codebase reads "theme". (See Cleanup tasks for full rename audit.)

**Location B — BaseLayout app-bar right side** (insert before locale-switcher in [BaseLayout.astro nav block](../../../site/src/layouts/BaseLayout.astro#L586)):

Single command button — small, square, status-bar-fit. WP10 app-bar command pattern.

```astro
<button type="button" class="metro-nav-theme-btn"
        data-theme-toggle
        aria-label={t.theme_toggle ?? 'Toggle theme'}>
  <span class="mif-sunny" aria-hidden="true"></span>
</button>
```

Styled in [BaseLayout.astro:540-665](../../../site/src/layouts/BaseLayout.astro#L540) `<style is:global>`:

```css
.metro-nav-theme-btn {
  background: transparent;
  border: 0;
  color: rgba(255,255,255,0.7);
  width: var(--sp-6);  /* matches nav height = 40px */
  height: var(--sp-6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
}
.metro-nav-theme-btn:hover { color: #fff; }
.metro-nav-theme-btn .mif-sunny { display: inline-flex; }
.metro-nav-theme-btn .mif-moon-right { display: none; }
.dark-side .metro-nav-theme-btn .mif-sunny { display: none; }
.dark-side .metro-nav-theme-btn .mif-moon-right { display: inline-flex; }
```

The button swaps `mif-sunny` ↔ `mif-moon-right` icon based on current state (icon shows the target state the button will switch to). This requires the icon markup to contain BOTH icons; only one is `display: inline-flex` at a time.

Revised markup:

```astro
<button type="button" class="metro-nav-theme-btn" data-theme-toggle
        aria-label={t.theme_toggle ?? 'Toggle theme'}>
  <span class="mif-sunny" aria-hidden="true"></span>
  <span class="mif-moon-right" aria-hidden="true"></span>
</button>
```

### Click handlers — single delegated listener

One delegated click listener in BaseLayout's `<script>` block handles both Hub `[data-theme]` buttons and nav `[data-theme-toggle]` button:

```js
// Runs once on first page load only (no data-astro-rerun)
function applyTheme(value /* "light" | "dark" */) {
  const isDark = value === 'dark';
  document.documentElement.classList.toggle('dark-side', isDark);
  try { localStorage.setItem('cantopedia-theme', value); } catch {}
  // Sync aria-pressed on Hub tiles (if present in current page)
  document.querySelectorAll('button[data-theme]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.theme === value ? 'true' : 'false');
  });
}

document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target : null;
  // Hub explicit tile: data-theme="light"|"dark"
  const tile = target?.closest('button[data-theme]');
  if (tile) {
    applyTheme(tile.dataset.theme);
    return;
  }
  // Nav single toggle button
  const toggle = target?.closest('[data-theme-toggle]');
  if (toggle) {
    const next = document.documentElement.classList.contains('dark-side') ? 'light' : 'dark';
    applyTheme(next);
  }
});

// Sync aria-pressed after every ClientRouter swap (Hub tiles re-render fresh)
document.addEventListener('astro:page-load', () => {
  const current = document.documentElement.classList.contains('dark-side') ? 'dark' : 'light';
  document.querySelectorAll('button[data-theme]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.theme === current ? 'true' : 'false');
  });
});
```

This script is plain `<script>` (no `data-astro-rerun`) so the click listener registers exactly once across the SPA lifetime. The listener uses event delegation on `document`, so it works for buttons that come and go via ClientRouter swap.

### FOUC handling — 3 scenarios

**Scenario 1 — Initial page load** (blocking `<script>` in `<head>`):

A second, separate script — this one `data-astro-rerun` — runs on first load and after every swap to ensure `.dark-side` is applied **before paint** based on localStorage:

```html
<script data-astro-rerun>
  (function () {
    try {
      let saved = localStorage.getItem('cantopedia-theme');
      // Migration: old 'auto' is treated as light (matches default behavior on first ever visit)
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

This runs **before** Astro's body content is rendered (or, on swap, before the new body is swapped in). It is blocking and head-positioned, so no paint happens with the wrong class.

**Scenario 2 — Toggle interaction**:

`applyTheme()` writes the class synchronously inside the click handler. No CSS `transition` on `--body-background`. Instant switch.

**Scenario 3 — ClientRouter cross-page nav**:

Two redundant guards (defense in depth):

1. `data-astro-rerun` script in head re-runs after fetch & before swap completes, re-applying `.dark-side` based on localStorage.
2. `astro:before-swap` listener (registered once in the no-rerun script) copies current `.dark-side` class to the incoming document's `<html>`, so even if the rerun timing is racy, the swap propagates the class correctly:

```js
// In the no-rerun script (registered once)
document.addEventListener('astro:before-swap', (e) => {
  if (document.documentElement.classList.contains('dark-side')) {
    e.newDocument.documentElement.classList.add('dark-side');
  }
});
```

This listener is in the same script block as the click delegation above; both register once on first page load and survive across swaps.

### Cleanup tasks

| File | Change |
|---|---|
| [BaseLayout.astro:50-64](../../../site/src/layouts/BaseLayout.astro#L50) (early inline script) | Simplify to the Scenario 1 version above. Drop `prefers-color-scheme` check. Drop `data-theme` / `data-themeChoice` dataset writes. Drop reading of those datasets anywhere. |
| [BaseLayout.astro:114-126](../../../site/src/layouts/BaseLayout.astro#L114) (second inline script) | Delete — merged into Scenario 1 above. |
| [BaseLayout.astro:225-265](../../../site/src/layouts/BaseLayout.astro#L225) (full theme handler `<script>`) | Replace with the click delegation + `astro:before-swap` + `astro:page-load` block above (no `data-astro-rerun`). |
| [BaseLayout.astro:290-308](../../../site/src/layouts/BaseLayout.astro#L290) (`:root` token block) | Add 4-line alias + 3-line `.dark-side` override (see Architecture). Keep `--t-plate-dark / --t-card / --t-ink-dim / --t-nav-bg` literal light values. |
| [BaseLayout.astro:423](../../../site/src/layouts/BaseLayout.astro#L423) (`html[data-theme="dark"]`) | Delete entirely. Replaced by the `.dark-side { ... }` block above. |
| [BaseLayout.astro:545, 582, 622](../../../site/src/layouts/BaseLayout.astro#L545) (`html[data-theme="light"]`) | Delete all 3. nav/footer are brand-fixed dark — base rule already handles them. |
| BaseLayout.astro nav block (around `.metro-nav.app-bar` markup) | Insert `<button data-theme-toggle>` (see Location B markup + CSS). |
| [Hub.astro:251-258](../../../site/src/components/Hub.astro#L251) | Delete auto button (lines 257-259). Rename `data-theme-choice` → `data-theme` on the 2 remaining buttons. |
| [site/src/i18n/zh.yml / yue.yml / en.yml](../../../site/src/i18n/) | Delete `auto:` key. Rename `light:` / `dark:` to `theme_light:` / `theme_dark:` (clearer intent). Add `theme_toggle:` for nav button aria-label. |

### Probe / test updates

| Probe | Change |
|---|---|
| [probe-theme-truth.mjs](../../../site/scripts/probe-theme-truth.mjs) | Check `document.documentElement.classList.contains('dark-side')` instead of `dataset.theme`. Drop `dataTheme` / `dataChoice` fields. Update `themeButtons` selector from `[data-theme-choice]` to `[data-theme],[data-theme-toggle]`. Remove auto-button assertions. |
| [probe-theme-tiles.mjs](../../../site/scripts/probe-theme-tiles.mjs) | Update click selectors: `button[data-theme-choice="dark"]` → `button[data-theme="dark"]`. Assertion: check `.dark-side` class on `<html>`, not `dataset.theme === 'dark'`. |
| [probe-theme-visual.mjs](../../../site/scripts/probe-theme-visual.mjs) | Remove all `[data-theme-choice="auto"]` checks and click steps. Update remaining selectors as above. |

## Verification strategy

Run order:

1. `pnpm dev` (foreground; handoff §4 notes detached mode kills Astro)
2. Updated `node scripts/probe-theme-truth.mjs` — expected output:

| State | `bodyBg` (computed) | `htmlBg` (computed) | `dark-side` on html | nav toggle present | hub toggles present |
|---|---|---|---|---|---|
| Home, no localStorage | `rgb(255, 255, 255)` (Metro default) | matches body | false | yes (1) | yes (2: light, dark) |
| Home, after click dark | `rgb(30, 31, 34)` (Metro `.dark-side` `#1e1f22`) | matches body | true | yes (1) | yes (2) |
| Dish page, after dark home → nav | same as above (no white flash) | same | true | yes (1) | no (Hub absent off-home) |
| AppList, fresh load with `localStorage['cantopedia-theme']='dark'` | dark | dark | true | yes (1) | no |

3. Updated `node scripts/probe-theme-tiles.mjs` — pass (click dark tile → `.dark-side` added; click light tile → removed)
4. Updated `node scripts/probe-theme-visual.mjs` — pass (screenshots before/after toggle on 3 page types)
5. Manual: open Chrome DevTools, throttle CPU 4× slowdown, reload home with dark localStorage — confirm zero white flash before painted body

## Risks

1. **Hub tile background fixed via inline `style="background: var(--m-yellow)"`** — these are intentional brand colors per tile, not `--t-*` token consumers. The yellow / purple stays the same in both modes. This is correct (it's WP10 vernacular — tiles are branded, not themed) but worth noting since the `aria-label` change is the only visible difference between light and dark Hub tiles.

2. **`mif-moon-right` icon visibility on `--m-purple` background**: confirm contrast ratio. Same as current behavior; not regressed.

3. **`data-theme` attribute name reuse**: Hub buttons get `data-theme="light"|"dark"` (intent: target state). This is **not** the same as old `<html data-theme="...">` (intent: current state). We're deleting the old `<html data-theme>` so no namespace clash. The attribute is now exclusively a button intent attribute.

4. **Nav button icon swap depends on `.dark-side` class being on `<html>` not `<body>`**: CSS selectors `.dark-side .metro-nav-theme-btn .mif-moon-right { display: inline-flex }` rely on class being on `<html>`. All our code does add to `<html>`. Document this so future devs don't move it.

5. **i18n key rename `light:` → `theme_light:`**: Search for any other consumer beyond Hub. Likely none (Hub utility row is the only known consumer). Grep before deletion.

6. **First-paint flash if localStorage is unreadable** (private mode, quota exceeded): try/catch returns silently → `.dark-side` not applied → light shown. Acceptable degradation.

7. **Two existing inline scripts at lines 50-64 and 114-126 may do different things**: spec assumes they're both theme-init scripts to be merged. Verify before deletion — if one is dictionary inject or analytics setup, keep that part untouched. (Quick `Read` of both blocks at plan-execution time.)

8. **Nav flex layout may squeeze on mobile viewport** after inserting the theme button. Current nav siblings: `.brand` (flex:1, centered) + `.locale-switcher` (3 lang links). Adding 40×40 button before locale-switcher reduces brand center room. At < 360px viewport this may push the locale row off-screen. Mitigation: button is only 1×1 → smallest possible footprint. Verify with `probe-pivot-tab.mjs` or visual probe on 320×568 viewport (iPhone SE).

## File-by-file scope

6 files touched + 3 probes:
- `site/src/layouts/BaseLayout.astro` (bulk of work: inline scripts, click handler, nav button markup + CSS, token aliases, delete 4 `html[data-theme]` selectors)
- `site/src/components/Hub.astro` (delete auto tile, rename data attr)
- `site/src/i18n/zh.yml` / `yue.yml` / `en.yml` (drop auto, rename keys, add toggle label)
- `site/scripts/probe-theme-truth.mjs` / `probe-theme-tiles.mjs` / `probe-theme-visual.mjs`

0 files renamed, 0 files deleted, 0 new files, 0 new dependencies.

## Metro Reuse Audit

Per user reinforcement (2026-05-26): "尽可能多使用 metro UI 的组件". Below is an explicit enumeration of every Metro v5 hook this spec leverages, plus what we evaluated and rejected (with reasons).

### Metro components / styles **used** by this spec

| Metro asset | Where | Role |
|---|---|---|
| `data-role="tile"` + `data-size="small"` + `.tile-small .wp-tile` classes | [Hub.astro:251-256](../../../site/src/components/Hub.astro#L251) | Hub Start Menu utility row tiles — Metro `tile` component drives sizing, grid placement, hover affordance |
| `mif-sunny` (☀ icon) | Hub light tile + nav toggle (light state) | Metro icon font glyph U+ED14 |
| `mif-moon-right` (☾ icon) | Hub dark tile + nav toggle (dark state) | Metro icon font glyph U+ED15 |
| `.dark-side` class selector | `<html>` root | Metro [base-theme.less:41](../../../site/node_modules/@olton/metroui/source/common-css/base-theme.less#L41) defines `.dark-side { --default-background, --default-color, --border-color, --default-background-disabled, ... }`. Adding the class flips Metro's token cascade. |
| `--body-background` / `--body-color` / `--border-color` / `--default-background-disabled` CSS custom properties | `:root` aliases in BaseLayout `:root` block | Direct source for our `--t-bg` / `--t-ink` / `--t-rule` / `--t-plate`. Metro defines them; we forward. |
| Metro's `body { background: var(--body-background); color: var(--body-color); }` rule | base-theme.less:59-62 | We do **not** override or duplicate this. Metro applies it; we benefit. |
| `.metro-nav` / `.metro-nav.app-bar` class | BaseLayout nav `<header>` (already in use) | Metro `app-bar` styling; theme button mounts inside it. |
| `--m-yellow`, `--m-purple` brand palette tokens | Hub tile `style="background: var(--m-yellow)"` | Brand-fixed (don't respond to theme), but defined as Metro/W3CSS Metro palette tokens. |

### Metro components / plugins **evaluated and rejected**

| Metro asset | Evaluated for | Reject reason |
|---|---|---|
| `theme-switcher` plugin | Hub & nav toggle UI + storage + class management | See Appendix A — 3 blockers (emoji visual, observer leak, storage key incompatibility). Workarounds (CSS override for icons, monkey-patch destroy(), accept legacy-user migration flash) net to **more code** than hand-written approach, not less. |
| `command-button` component | Nav toggle button | [command-button.less:50-52](../../../site/node_modules/@olton/metroui/source/components/command-button/command-button.less#L50) icon is 43×43, total button ~60px tall. Our nav status bar is 40px (`--sp-6`). Adopting requires 5+ CSS override rules to shrink, plus disabling the `.dark-side` hover token (nav is brand-fixed dark, doesn't respond to theme). Net cost > hand-written. |
| `action-button` component | Nav toggle button | Material-Design FAB-style (circular, floating). Non-WP10 vernacular. |
| `hamburger` component | Nav toggle button | Three-line menu icon. Semantically wrong (we're not opening a menu). |
| `drop-menu` / `d-menu` component | Nav toggle as dropdown of 2 options | Hover-based reveal — bad for touch. 2 options is too few to justify dropdown UI overhead. |
| `button-group` component | Hub 2 buttons as radio-style mutually-exclusive group | Would add Metro group spacing/border rules that conflict with `.tile-small` grid cell sizing. Hub already groups its tiles via the utility row's flex layout. |
| `switch` component | Nav toggle as iOS-style switch | Non-WP10 vernacular (iOS aesthetic). |
| `Metro.storage` utility | localStorage read/write | JSON-encodes values + prefixes keys with `:`. Incompatible with our existing `cantopedia-theme` raw-string convention. Native `localStorage.getItem/setItem` is 2 lines and zero migration. |

### Conclusion

Within the dark-mode scope, Metro UI reuse is maximized. Every dependency the spec adds is at the **CSS variable / class-selector / component-markup-role** level. The only logic written by hand is ~30 lines of click-delegation + ~10 lines of FOUC inline scripts — both of which use no Metro-replaceable abstraction (event delegation on `document` and localStorage R/W are platform primitives, not component-shaped concerns).

---

## Appendix A — Why we don't use Metro `theme-switcher` plugin

Investigated and rejected during ultrathink audit (2026-05-26). The component exists at [site/node_modules/@olton/metroui/source/components/theme-switcher/](../../../site/node_modules/@olton/metroui/source/components/theme-switcher/) and would in theory do the `.dark-side` toggle + localStorage persistence for us. Three blockers:

1. **Non-WP10 visual.** [theme-switcher.less:117-163](../../../site/node_modules/@olton/metroui/source/components/theme-switcher/theme-switcher.less#L117) renders `mode-button` as a 36×36 circular button with emoji (`☀` / `☾`) text content (via `content: attr(data-light-symbol)`). `mode-switch` renders an iOS-style toggle with emoji slider. WP10 vernacular is rectangular tiles with `mif-*` font icons; circular + emoji is Material Design / casual-web aesthetic.

2. **MutationObserver leak.** [theme-switcher.js:78-91](../../../site/node_modules/@olton/metroui/source/components/theme-switcher/theme-switcher.js#L78) registers an observer on `<html>` to sync `checked` state. [theme-switcher.js:136-138](../../../site/node_modules/@olton/metroui/source/components/theme-switcher/theme-switcher.js#L136) `destroy()` only removes the container — it does **not** call `observer.disconnect()`. Every ClientRouter swap re-init's the input (fresh markup from SSG), registering a new observer. Old observer's callback closure holds the old detached input ref → both leak. After 50 SPA navs, 50 observers fire on every `<html>` class change.

3. **Storage layer incompatibility.** [theme-switcher.js:115](../../../site/node_modules/@olton/metroui/source/components/theme-switcher/theme-switcher.js#L115) writes via `Metro.storage.setItem` which (a) `JSON.stringify`s the value (boolean → `"true"` / `"false"` strings with quotes encoded), and (b) prefixes the key with `:` (from [storage.js:17](../../../site/node_modules/@olton/metroui/source/components/storage/storage.js#L17): `setItem(`${this.key}:${key}`, ...)` with `this.key === ""`). So `data-save-state-key="cantopedia-theme"` actually writes to localStorage key `:cantopedia-theme` with value `"true"`. Migration from our existing `cantopedia-theme` (no colon, raw `'dark'` string) needs explicit handling. Our own implementation skips both quirks.

The component does correctly identify `.dark-side` on `<html>` as the canonical hook. We adopt that hook; we do not adopt the component.
