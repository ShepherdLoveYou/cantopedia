# WP10 Mobile Start Menu redesign with @olton/metroui

**Branch:** `feat/wp10-metroui`
**Base commit:** `cee6736` (handoff state)
**Author:** Claude session 2026-05-25
**Status:** Design — not yet implemented

---

## Goal

Transform Cantopedia's UX from its current Hub Pattern (custom WP10-inspired CSS) into a faithful WP10 Mobile experience using `@olton/metroui` as the tile framework. The user's `feedback_dont_reinvent_wheel.md` memory mandated using `olton/metroui` instead of hand-rolling tile CSS — last round we ignored that and the resulting hand-rolled-then-replaced approach caused churn.

**Non-goal:** complete OS clone. We are an app, not a launcher. We adopt WP10 vocabulary (Start Menu, Live Tiles, Pivot Hub, App List) and visual treatment, not OS chrome (no fake status bar with virtual signal/battery icons).

---

## Inventory: current state at `cee6736`

### Hub.astro (the hub renderer)
- 9 panels in one horizontal scroll-snap container: `home` + 8 categories sorted by `sort_order`
- Home panel content: `.panorama` header + `#featured-tile` (rotating today/random/recent dish, 6s interval) + 4 `.stat-tile` (complete/draft/stub/total counts) + `.start-screen` grid with 8 `.tile` (one per category, sized w/m/s by dish count)
- Category panels: `.cat-hero` colored header (count + name + description + multilingual names) + `.dish-grid` with `.dish-card.has-back` (3D flip showing dish photo)
- Pivot strip: `‹` arrow + bold title + `›` arrow (no peek text — the WP10 prev/next dim labels we tried to add last round)
- Custom CSS: ~500 lines covering `.tile`, `.face`, `.live-tile-face`, `.dish-card`, `.card-face`, `.featured-tile`, `.featured-face`, `.stat-tile`, `.start-screen` grid-areas

### BaseLayout.astro
- 40px black sticky `.metro-nav` with hamburger button (`#hamburger`) + brand link (`CANTOPEDIA`) + locale switcher (中/粵/EN)
- Acrylic `.nav-drawer` slide-out (left side, 78vw wide, focus-trapped via `focus-trap` MIT lib) containing: search link, browse categories list, language buttons, theme radio (light/dark/auto), GitHub footer link
- `data-astro-rerun` inline script reads `localStorage.cantopedia-theme` and sets `data-theme` on `<html>` before paint (no FOUC)
- View Transition layered animations: root cross-fade + per-tile shared-element morphs (`view-transition-name: tile-${cat}` and `dish-${id}`)
- `main { max-width: 1200px; padding: 1.5rem 1.5rem 6rem }` — Hub's scoped `main { … !important }` override does NOT escape Astro scope, leaving panels clipped (a known bug from prior round)

### Pages that DON'T use Hub
- `dish/[id].astro` — hero photo with Ken Burns + parallax, ingredients/method/sources sections
- `ingredients/[id].astro`, `sauces/[id].astro` — info pages
- `search.astro` — Pagefind index UI
- `404.astro`

### Existing bugs in `cee6736` (deliberately not fixed in this design — separate concern)
The session's earlier rounds found and fixed these, but rollback wiped them. They will resurface and need to be re-fixed during implementation:
1. **SPA-nav script no-rerun:** Hub.astro's 3 scripts (nav, featured-tile, live-tile-flip) are bundled modules — run once per session. ClientRouter swaps Hub DOM but scripts don't re-init, so navigated-into pages have dead featured tile / dead flip / wrong scroll position.
2. **Panel clipping:** Hub.astro scoped `main { max-width:none !important }` doesn't reach `<main>` in BaseLayout. Panels overflow viewport by 48–128px on right edge.
3. **Pivot scroll math:** uses `hub.clientWidth` for scroll arithmetic. With clientWidth ≠ 100vw (due to main padding), scroll position is off; browser snap masks it on initial load but breaks on resize.
4. **Tile CJK overflow:** long names like `湯米線 / 喇沙` (8 chars) break mid-character in narrow tiles.

These are **independent of metroui**. They get re-fixed during metroui refactor as the relevant code is touched.

---

## Target state

### Site-wide
| Page | Treatment | Metro CSS loaded? |
|---|---|---|
| `/[locale]/` (home) | Start Menu — Metro tiles only, no panorama | ✅ via Hub.astro |
| `/[locale]/all` (NEW) | App List — A-Z dish index, vertical scrolling | ✅ via Hub.astro (full metro.css + icons.css, since it lives inside the Hub container) |
| `/[locale]/browse/[cat]` | Hub category panel — Metro dish tiles | ✅ via Hub.astro |
| `/[locale]/dishes/[id]` | Unchanged | ❌ — keep lean |
| `/[locale]/ingredients/[id]` | Unchanged | ❌ |
| `/[locale]/sauces/[id]` | Unchanged | ❌ |
| `/[locale]/search` | Unchanged | ❌ |
| `/404` | Unchanged | ❌ |

### Hub structure (10 panels)
```
[Start | AppList | appetizer | soup-wonton | rice | noodle | soup-noodle | baked-rice | congee | main]
   0       1          2            3          4       5         6              7           8       9
```
- Pivot peek text (the WP10 Mobile prev/next dim labels) — re-add per `2026-05-25-pivot-peek` work that got rolled back
- Wrap modulo 10
- URLs: `/zh`, `/zh/all`, `/zh/browse/{cat}`

### Start Menu (home panel) contents
Vertical-flowing `tiles-grid` of Metro tiles (no panorama header):
- 1× wide live tile — featured dish, photo background, 6s rotator cycling today/random/recent. **Reuse** the existing `featuredDishes` data prep ([Hub.astro:104-109](site/src/components/Hub.astro#L104-L109)) and the inline featured-tile JS — just remap the markup from `.featured-tile + .featured-face` to `.tile-wide + .cat-tile.featured-tile + .cat-face` template classes.
- 8× category tiles — sized by dish count (≥20 → wide, ≥7 → medium, <7 → small), each cycling 2s solid (icon + name + count badge) ↔ photo (random dish from category)
- 4× medium stats tiles — complete/draft/stub/total. Use inline `style="background: var(--m-green)"` etc. instead of Metro `bg-*` classes (see gotcha #3); existing `--m-green`/`--m-orange`/`--m-steel`/`--m-red` tokens in BaseLayout cover the four colors.
- Utility row: search tile (`mif-search`), 3× theme tiles (`mif-sunny`/`mif-moon-right`/`mif-cog`), GitHub tile (`mif-github`) — all small. **Verify these `mif-*` glyph names exist** in `icons.css` during step 1 — if any are missing, substitute with an existing icon name from the inventory.

### AppList panel contents
- Vertical list of all 66 dishes, A-Z sorted (by jyutping or English name, language-dependent)
- Each row: thumbnail (40×40) + dish name + category badge
- Section headers (letter dividers) optional
- No tiles — this is a Metro "list view" pattern

### Category panel (browse/[cat]) contents
- No `.cat-hero` (pivot title already names the category)
- `tiles-grid` of dish tiles: **default to all medium** (uniform grid). The "first dish wide + rest medium" variant is a possible follow-up after step 6 visual review — do not implement on first pass.
- Each dish tile: photo background (if available) + dish name overlay (`.branding-bar`) + menu number badge. **Static** — no face cycling on dish tiles (cycling lives on Start Menu's category tiles only, where it adds value by previewing dishes in each category). The current 3D flip behavior on `.dish-card.has-back` is dropped without replacement; the WP10 Continuum tile-to-page morph (view-transition-name) still provides motion on click.

### Navbar
- Keep 40px black `.metro-nav` with brand + locale switcher
- **Remove hamburger button** (user request — "汉堡菜单可以不要")
- Drawer GONE — search/theme/github all live in Start Menu utility tiles
- Trade-off: users on dish/ingredient/sauce/search pages must click brand to return home before searching or theme-switching. Accepted because WP10 Mobile users always returned to Start.

---

## Metro UI integration details

### Install
```bash
pnpm add @olton/metroui
```
Currently uninstalled (rollback removed it). v5.1.20 verified to render correctly.

### Imports
**Only in Hub.astro frontmatter:**
```ts
import '@olton/metroui/lib/metro.css';   // ~1.5M unminified, ~50KB gzipped
import '@olton/metroui/lib/icons.css';   // ~384K, mif-* glyphs
```
Astro bundles these into the per-page CSS for pages that render Hub (home + 8 browse + AppList). Dish/ingredient/sauce/search pages **do not** get Metro CSS.

### CSS-only usage (no Metro JS)
Use class-based markup (`.tile-small/.tile-medium/.tile-wide/.tile-large`) — these work standalone without `data-role="tile"`. Avoid Metro's 898KB JS bundle entirely. The features we'd lose (image-set rotation, slide effects) we reimplement ourselves with smaller per-feature JS.

### Known gotchas (learned the hard way last round)
1. **`m4-cloak`:** Metro sets `.m4-cloak { opacity: 0 !important }` to hide content until JS init. Without JS, content stays invisible. **Do NOT apply `class="m4-cloak"` to `<body>`.**
2. **Metro `body { display: flex; overflow-x: hidden }`:** breaks Hub's horizontal scroll. The hub container ends up sized to fit all 9-10 panels (~11500px wide). **Mitigation:** first escape `<main>`'s max-width via `is:global` rule `main:has(#hub) { max-width: none; padding: 0 }`, then `.hub { width: 100%; overflow-x: auto !important }`. **Do NOT use `100vw`** — on Windows/Chrome that includes scrollbar gutter and overflows by ~15px. Also: Metro's body rules apply globally on every Hub-loading page, so audit the BaseLayout `<nav>`, `<footer>`, and locale switcher for unintended restyling in step 3 (see gotcha #6 below).
3. **Metro `bg-*` palette doesn't match WP10 nomenclature 1:1:** last round we assumed `bg-darkBlue` existed — it doesn't. **Do NOT hand-author the palette list from memory.** Instead, as part of step 1's smoke test: grep the installed `node_modules/@olton/metroui/lib/metro.css` for `\.bg-[A-Za-z]+\b` and paste the extracted list back into this gotcha for reference. Until that's done, treat the palette as unknown. **Preferred:** use inline `style="background: var(--m-blue-dark)"` referencing existing `--m-*` tokens already defined in [BaseLayout.astro:402-420](site/src/layouts/BaseLayout.astro#L402-L420) (these include `--m-blue-dark` and `--m-orange-dark`, the two darker shades WP10 actually used). This avoids the Metro class-name mismatch entirely.
4. **Sharp corners:** Metro UI is mostly square already, but defense-in-depth: `[class*=tile-] { border-radius: 0 !important }`.
5. **Fixed tile dimensions:** small=70×70, medium=150×150, wide=310×150, large=310×310. **NOT responsive** — gaps appear on resize. **Mitigation:** wrap in `.tiles-grid` with `flex-wrap: wrap` (Metro's default). For <540px viewports, do **NOT** use `transform: scale()` — it shrinks the rendered size but leaves the layout box at full dimension, producing dead gaps. Instead override `width`/`height` directly per breakpoint, or use non-standard `zoom: 0.85` (well-supported in Chromium/WebKit; Firefox now supports it). Pick concrete breakpoints in step 3 once tiles render.
6. **Metro CSS imports are GLOBAL, not page-scoped:** Astro's frontmatter `import` of metro.css becomes a global stylesheet for every page that renders Hub.astro. That means Metro's `body{}`, `*{}`, `a{}` and other element-selector rules will restyle BaseLayout's `.metro-nav`, `<footer>`, locale switcher, `.brand`, etc. on the home + 8 browse + AppList pages — even though those elements live in BaseLayout, not Hub. **Mitigation:** during step 3 verification, screenshot-diff a Hub-page nav/footer against a dish-page nav/footer; for each Metro override that breaks our design, add a counter-override scoped to `.metro-nav`/`footer`/etc. in BaseLayout's global style block.

### Template class pattern (per user instruction "做一个模板类，后面所有的tile都可以不断复制这个模板类")
- `.cat-tile` — extends `.tile-{size}`, adds photo/solid face system + cycling
- `.util-tile` — extends `.tile-small`, adds icon + label layout
- `.stat-tile-mt` — extends `.tile-medium`, adds stat number layout
- Hub.astro's `<style>` block defines these once; markup composes `tile-{size} cat-tile` / `tile-small util-tile` etc.

---

## Live Tile face cycle (the "翻转" behavior)

Per user spec — `图片1 → 原始纯色样式说明 → 图片2 → 原始纯色样式说明 …`, each face holds 2s:

### Markup per tile
```html
<a class="tile-medium cat-tile has-imgs">
  <div class="cat-face cat-face--solid">
    <span class="cat-tile-icon"><CategoryIcon … /></span>
    <span class="branding-bar">{catName}</span>
    <span class="badge-bottom">{count}</span>
  </div>
  <div class="cat-face cat-face--photo" style="background-image: url('{img1}')"></div>
  <div class="cat-face cat-face--photo" style="background-image: url('{img2}')"></div>
  <!-- ...up to 4 photo faces -->
</a>
```
For tiles with NO photo: only the solid face renders, with `class="cat-face cat-face--solid active"` baked into SSR (no JS dependency).

### CSS
- All faces position-absolute, default `transform: rotateX(90deg); opacity: 0`
- `.active` face: `transform: rotateX(0deg); opacity: 1`
- Transition: `transform 520ms cubic-bezier(0.6, 0, 0.2, 1), opacity 220ms`
- Solid face background: tile color (existing `tileColors[cat.id]`)
- Photo face has `::after` overlay gradient for text legibility

### JS driver
- Find all `.cat-tile.has-imgs`
- Per tile: state = (showSolid: bool, photoIdx: int). `setInterval(tick, 2000)`.
- `tick()`: alternate showSolid; if true → activate solid face; if false → activate `photos[photoIdx]`, increment photoIdx mod N.
- Stagger initial start by `tileIdx * 350ms` so tiles don't all flip in sync (looks robotic).
- **MUST hook `astro:before-preparation` to stopFlip, `astro:after-swap` + `astro:page-load` to maybeStartFlip** — otherwise navigating Hub→Hub leaves dead tiles (the SPA-nav bug from earlier).
- Respect `prefers-reduced-motion`: skip the JS driver, leave solid face active.

---

## What to keep from current Hub.astro

Carry over without modification:
- `getCollection('category')` / `getCollection('dish')` data loading + sort by `sort_order`
- `nameOf(c)` / `descOf(c)` helpers
- `CategoryIcon` component imports
- `tileColorFor(catId)` / `tileColors` color palette
- `commonsThumb` for Wikimedia image URLs
- `dishesByCat` Map
- `featuredDishes` data passed to featured tile

Carry over with re-fixes (since rollback wiped the earlier-round fixes):
- Hub nav script with `initHub()` function + `astro:after-swap` + `astro:page-load` re-init
- `panels[i].offsetLeft - panels[0].offsetLeft` for scroll math (not `i * clientWidth`)
- `hub-pivot-peek--prev/--next` with dim text (WP10 Mobile style)
- `is:global` style block: `main:has(#hub) { max-width: none; padding: 0 }`
- `word-break: keep-all; overflow-wrap: anywhere` on tile name text

---

## What to drop

From Hub.astro (delete after refactor):
- `.tile`, `.face`, `.live-tile-face` and all variants — replaced by `.cat-tile + .cat-face`
- `.featured-tile` custom CSS — replaced by `.tile-wide + cat-tile.featured-tile` template
- `.stat-tile` + `.stat-tiles` grid CSS — replaced by `.tile-medium + stat-tile-mt`
- `.start-screen` with `grid-area` placement — replaced by `.tiles-grid` flex-wrap layout
- `.panorama`, `.panorama-stripe`, `.pivot-h` — no panorama on Start Menu
- `.dish-grid` + `.dish-card.has-back` + `.card-face` — replaced by Metro tiles in category panels
- `.cat-hero` + `.cat-no/cat-name/cat-desc/cat-langs` — drop the big colored header
- The Live Tile flip script (`startFlip`/`stopFlip` targeting `.start-screen .tile`) — replaced by `.cat-tile` face cycler

From BaseLayout.astro:
- `<button class="hamburger">` markup + CSS (`.hamburger`, `.hamburger-bar`)
- `<div class="drawer-scrim">` + `<aside class="nav-drawer">` markup
- All `.drawer-*` CSS (~150 lines)
- Drawer JS: `getDrawer/getScrim/open/close/toggle/setup`, focus-trap import + lifecycle
- `dict.menu`, `dict.tag_browse`, `dict.tag_search`, `dict.theme`, `dict.light`, `dict.dark`, `dict.auto`, `dict.github` (now unused)
- `drawerCategories`, `categoryCounts` derivations (now unused in BaseLayout)
- `focus-trap` package dependency

---

## Implementation order (de-risked)

Each step must verify (visual screenshot + state probe) before moving on. **Do not stack changes** — commit each step.

1. **Smoke test** — install metroui, add `/metro-test` page, verify tiles render with `tile-small/medium/wide/large` classes. Check `m4-cloak` not on body. **Also extract palette:** `grep -oE '\.bg-[A-Za-z]+\b' node_modules/@olton/metroui/lib/metro.css | sort -u` and paste the result back into gotcha #3 above (replacing the "treat as unknown" placeholder). **Commit:** `chore: add @olton/metroui + smoke test + extract palette inventory`.

2. **Re-fix SPA-nav script reinit + panel clip + pivot peek** (the early-round fixes that got rolled back). First try `git reflog` + `git log --all --oneline --grep='hub\|pivot peek\|panel clip'` to recover the original commits; if found, cherry-pick. If not recoverable, rewrite from the symptom list in inventory section "Existing bugs in `cee6736`". Do these in `cee6736`'s existing Hub.astro WITHOUT metroui — get back to a known-good baseline before introducing metroui-layout changes. **Commit:** `fix: hub nav script reinit + panel clip + pivot peek (re-applied post-rollback)`.

3. **Hub home panel → Metro tiles**, keep browse panels custom for now. Import metro.css into Hub. Wire up cat-tile face cycler. Verify on desktop + mobile + 3 locales + ClientRouter nav home→browse→home. **Plus mandatory CSS-leak audit:** screenshot-diff `.metro-nav` + `<footer>` + locale switcher on a Hub page vs. a dish page; counter-override any Metro restyling in BaseLayout's global style block (see gotcha #6). **Commit:** `feat: home Start Menu with Metro tiles + 2s face cycle + nav/footer counter-overrides`.

4. **Add theme + utility tiles to Start Menu, drawer still in place as fallback.** New utility row: search tile, 3× theme tiles (light/dark/auto), GitHub tile. Hook theme buttons to existing `applyChoice()` flow in BaseLayout. Verify theme tiles toggle correctly on home; verify drawer theme toggle still works in parallel. **Commit:** `feat: utility + theme tiles on Start Menu (drawer still wired)`.

5. **Drop drawer + hamburger.** Remove drawer DOM, drawer CSS (~150 lines), drawer JS, focus-trap import, focus-trap from package.json. Confirm theme + locale switching still work end-to-end across all locales and theme modes. **Commit:** `refactor: remove drawer + hamburger (theme now on Start Menu)`.

6. **Hub browse panels → Metro tiles** (dish-grid → tiles-grid + cat-tile.dish-tile). Decide here whether dish tiles get the cycling face system or stay static — see "Category panel" section above. Verify pivot wrap, dish click, view-transition morph. **Commit:** `feat: browse panels with Metro dish tiles`.

7. **Insert AppList panel** as index 1 in Hub. New `/[locale]/all` route. A-Z dish list rendering. Update pivot peek + script to handle 10 panels. **Commit:** `feat: AppList panel + /all route`.

8. **Delete dead CSS + smoke route** — strip unused custom tile rules from Hub.astro and remove the `/metro-test` route from step 1. **Commit:** `chore: remove dead tile CSS + metro-test smoke route`.

9. **QA sweep** — 3 viewports × 3 locales × 10 panels + dish/ingredient/sauce/search/404. Reuse existing probes in `site/scripts/` (probe-pivot, probe-vt, probe-fps, probe-hub-fps); if a gap exists, write a new probe rather than referencing a non-existent `probe-audit.mjs`. Fix any regressions. **Commit:** `test: full audit sweep + final fixes`.

10. **PR + merge** — squash if commits are messy, otherwise keep step-by-step history.

---

## Risks & open questions

| Risk | Mitigation |
|---|---|
| metroui bundle weight (50–80KB gzipped extra) | Acceptable for content site. Load only on Hub pages (already designed). |
| Tile responsiveness (fixed-px sizes break on resize) | Use `tiles-grid` flex-wrap. Add responsive scale via `@media (max-width:540px) [class*=tile-] { transform: scale(0.85) }` if needed. |
| Theme support — Metro `bg-*` classes are fixed colors | Use CSS `var(--m-red)` etc. via inline `style`, not Metro `bg-red`. Existing palette tokens already adapt to dark mode. |
| View Transition morph breakage — Metro CSS resets may strip `view-transition-name` | Verify each step. `view-transition-name: tile-${cat}` is inline style → can't be stripped by Metro CSS. |
| Non-Hub pages broken by Metro CSS leaking globally | Hub-only import + `is:global` only for `main:has(#hub)` rule. Audit by checking dish/ingredient/sauce pages each step. |
| Locale switcher in navbar — Metro CSS may restyle `<nav>` | Test early. Override in BaseLayout if needed. |
| Pivot drag gesture (touch swipe) — removed by Hub refactor stage 1 | Out of scope. Keep arrow + click for now. |
| AppList sort key (jyutping vs Chinese stroke vs English alpha) | Default to jyutping for zh/yue, English alpha for en. Section headers by first letter. |

---

## Out of scope (defer to future work)

- WP10 Mobile bottom Charms bar / app-bar
- Status bar with virtual time/wifi/battery icons
- Touch drag pivot gesture
- True WP10 dark theme accent color picker
- Tile pin/unpin user customization
- Voice search (Cortana parody)

---

## Why this design likely works (vs. last round)

Last round mistakes and how this design avoids them:

| Last round | This round |
|---|---|
| Started coding without design — kept changing direction | Spec written first; checkpoints after each step |
| Mixed re-fixes (SPA-nav etc.) with metroui rewrite | Step 2 re-fixes baseline BEFORE metroui (step 3+) |
| Lost track of what bugs were old vs introduced | Each step commits; rollback to any step is `git reset` |
| User caught many bugs visually because no audit between changes | Each step screenshot-verified before moving on |
| Didn't account for `m4-cloak` / Metro body styles → blank page | Documented gotchas (this doc), plus mandatory CSS-leak audit in step 3 |
| Tried to do home + browse + drawer + theme + AppList in parallel | Strictly serial 10-step order with commits between; theme tiles (step 4) ship BEFORE drawer drop (step 5) so there's always a working theme control |
| Ignored user's `feedback_dont_reinvent_wheel.md` memory at start | Spec opens by citing it; metroui is the foundation |
