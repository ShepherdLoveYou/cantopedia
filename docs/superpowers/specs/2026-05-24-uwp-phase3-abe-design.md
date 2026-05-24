# UWP Phase 3 (A + B + E) — Design Spec

**Date:** 2026-05-24
**Predecessor:** v0.2.0 shipped (Phase 2 = pivot + morph + Fluent tokens)
**Visual contract:** [`docs/prototypes/2026-05-24-uwp-mock.html`](../../prototypes/2026-05-24-uwp-mock.html) (commit `b9a8b3c`) — user-approved
**Roadmap parent:** [`2026-05-24-uwp-phase3-design-stub.md`](./2026-05-24-uwp-phase3-design-stub.md)

## Goal

Port three prototype features to the live Astro site so the homepage and tile interactions become unmistakably WP10 Mobile:

- **A. Start Screen** — replace homepage's uniform `auto-fit` tile grid with an explicit 4-column × 6-row Metro Start Screen using size-variant tiles (1 WIDE, 3 MEDIUM, 4 SMALL).
- **B. 3D tilt press + inline monoline SVG icons** — upgrade `.wp-tile:active` from scale-only to directional 3D tilt toward the press point (max 3°, scale 0.96). Replace 8 emoji category glyphs with hand-drawn monoline SVG icons (Segoe MDL2 style).
- **E. Live Tile flip** — the WIDE main tile flips along its X-axis every 8 seconds. Front face = icon + name + count. Back face = dictionary statistics (no daily recommendations, no photos — those require dish images which are out of scope).

Out of scope (deferred to Phase 4-6 per the stub doc):
- Hamburger drawer + acrylic blur
- Dark / Light dual mode
- Dynamic accent color cycle
- Bottom AppBar (no toggles UI in Phase 3 because no theme/accent to toggle yet)
- Wide-tile photo flip back (requires dish images pipeline)
- A-Z jumping grid search
- Continuum dominos transitions

## Decisions made (carried from earlier brainstorming + prototype review)

| # | Decision | Rejected alternatives |
|---|---|---|
| 1 | Tile size mapping by dish count: ≥20 → WIDE, 7-19 → MEDIUM, <7 → SMALL | Manual override per category (less repeatable); equal-weight grid (defeats Start Screen) |
| 2 | Explicit grid-area placement per tile (not auto-flow) | `grid-auto-flow: dense` (less predictable layout); flexbox (can't span both rows + cols cleanly) |
| 3 | 4 columns × 6 rows, `--tile-unit: clamp(72px, 18vw, 200px)` for responsive scaling | Fixed pixel sizes (breaks on 4K and mobile); fluid `repeat(auto-fit, minmax(...))` (breaks size hierarchy) |
| 4 | 3D tilt press = CSS perspective + `rotateX/rotateY` driven by `--tilt-x` / `--tilt-y` set by inline JS | Pure CSS-only (no per-tap direction); pull a tilt library (overkill, ~5KB for ~15 LOC of our own) |
| 5 | One central `<CategoryIcon cat={id} />` component with all 8 SVGs in a path map | Per-category SVG files (8 file proliferation); icon font (extra HTTP, font-rendering issues) |
| 6 | Live Tile flip = CSS `backface-visibility: hidden` + `setInterval(toggle, 8000)`, pauses on `document.hidden` and during press | Pure CSS animation loop (no pause control); WebAnimation API (heavier than needed) |
| 7 | Back of WIDE Live Tile = static dictionary stats (`66 道菜 · 8 大類 · 三語可溯`); NO recommendation/photo carousel | Random dish recommendations (no deterministic curation logic yet); photos (require image pipeline) |

## Tile size mapping (concrete)

| Category | sort_order | Dishes | Size | grid-area (row-start / col-start / row-end / col-end) |
|---|---|---|---|---|
| main 主菜 | 80 | 22 | **WIDE** | `1 / 1 / 3 / 5` |
| rice 炒飯 | 30 | 11 | MEDIUM | `3 / 1 / 5 / 3` |
| noodle 炒麵 | 40 | 8 | MEDIUM | `3 / 3 / 5 / 5` |
| appetizer 茶水 | 10 | 7 | MEDIUM | `5 / 1 / 7 / 3` |
| soup-noodle 湯麵 | 50 | 5 | SMALL | `5 / 3 / 6 / 4` |
| baked-rice 焗飯 | 60 | 5 | SMALL | `5 / 4 / 6 / 5` |
| congee 粥品 | 70 | 5 | SMALL | `6 / 3 / 7 / 4` |
| soup-wonton 湯雲吞 | 20 | 3 | SMALL | `6 / 4 / 7 / 5` |

Visual:
```
+------------------+
| W W W W          | main (rows 1-2)
| W W W W          |
+------------------+
| R R | N N        | rice + noodle (rows 3-4)
| R R | N N        |
+----+----+--+----+
| A A | s | s     | appetizer + soup-noodle + baked-rice (row 5)
| A A | s | s     | appetizer + congee + soup-wonton (row 6)
+----+----+--+----+
```

## Architecture

### New file

| File | Purpose | LOC est |
|---|---|---|
| `site/src/components/CategoryIcon.astro` | 8 monoline SVG paths in a map, single `<svg>` consumes by `cat` prop | ~50 |

### Modified files

| File | Change |
|---|---|
| `site/src/pages/[locale]/index.astro` | (a) Replace `.tile-grid` with `.start-screen` 4×6 explicit grid. (b) Per-tile `grid-area` based on the size mapping table above. (c) Replace `tileGlyphs` emoji map with `<CategoryIcon cat={cat.id} />`. (d) Add `size-w` / `size-m` / `size-s` classes on each tile for size-specific typography + content. (e) On the WIDE main tile, render two `.face` (front / back) for the Live Tile flip. (f) Add inline `<script>` to setInterval the WIDE tile flip every 8 seconds (pauses when `document.hidden` or `.pressing`). |
| `site/src/layouts/BaseLayout.astro` | (a) Replace existing `.wp-tile:active { transform: scale(0.96) !important; }` with a 3D tilt version that consumes `--tilt-x` and `--tilt-y` CSS variables. (b) Add inline `<script>` that on `pointerdown` over any `.wp-tile` computes press position relative to tile center, sets `--tilt-x` / `--tilt-y` (each capped at ±3deg), adds `.pressing` class. On `pointerup` / `pointercancel` / `pointerleave`, remove `.pressing`. |

No data, no schema, no pipeline changes. No new npm deps.

## Component design

### `CategoryIcon.astro`

```astro
---
interface Props {
  cat: 'appetizer' | 'soup-wonton' | 'rice' | 'noodle' | 'soup-noodle' | 'baked-rice' | 'congee' | 'main';
  size?: number;
}
const { cat, size = 32 } = Astro.props;

// Monoline SVGs, all in 0 0 32 32 viewBox with stroke="currentColor" stroke-width="1.4".
// Hand-drawn to be visually distinct yet stylistically consistent (Segoe MDL2 vibe).
const PATHS: Record<Props['cat'], string> = {
  // 茶水 — teacup with steam squiggles
  appetizer: `
    <path d="M8 14 H22 V20 Q22 24 16 24 Q10 24 10 20 Z"/>
    <line x1="22" y1="16" x2="25" y2="16"/>
    <path d="M25 16 Q27 18 25 20"/>
    <path d="M13 8 Q13 12 14 12"/>
    <path d="M16 8 Q16 12 17 12"/>
    <path d="M19 8 Q19 12 20 12"/>
  `,
  // 湯雲吞 — bowl with 3 wonton bumps inside
  'soup-wonton': `
    <path d="M5 18 Q5 26 16 26 Q27 26 27 18 Z"/>
    <line x1="4" y1="18" x2="28" y2="18"/>
    <circle cx="11" cy="22" r="1.6"/>
    <circle cx="16" cy="22" r="1.6"/>
    <circle cx="21" cy="22" r="1.6"/>
  `,
  // 炒飯 — rice bowl with 5 grain dots
  rice: `
    <path d="M4 16 Q4 24 16 26 Q28 24 28 16 Z"/>
    <line x1="3" y1="16" x2="29" y2="16"/>
    <circle cx="10" cy="20" r="0.7" fill="currentColor"/>
    <circle cx="16" cy="22" r="0.7" fill="currentColor"/>
    <circle cx="22" cy="20" r="0.7" fill="currentColor"/>
    <circle cx="13" cy="18" r="0.7" fill="currentColor"/>
    <circle cx="19" cy="18" r="0.7" fill="currentColor"/>
  `,
  // 炒麵 — 3 wavy noodle strands
  noodle: `
    <path d="M4 10 Q10 6 16 10 T28 10"/>
    <path d="M4 16 Q10 12 16 16 T28 16"/>
    <path d="M4 22 Q10 18 16 22 T28 22"/>
  `,
  // 湯麵 — bowl with noodle squiggle inside
  'soup-noodle': `
    <path d="M5 18 Q5 26 16 26 Q27 26 27 18 Z"/>
    <line x1="4" y1="18" x2="28" y2="18"/>
    <path d="M8 22 Q12 20 16 22 T24 22"/>
  `,
  // 焗飯 — oven box with crust line on top
  'baked-rice': `
    <rect x="6" y="10" width="20" height="16" fill="none"/>
    <line x1="6" y1="16" x2="26" y2="16"/>
    <line x1="9" y1="13" x2="9" y2="13.6" stroke-linecap="round"/>
    <line x1="13" y1="13" x2="13" y2="13.6" stroke-linecap="round"/>
    <line x1="17" y1="13" x2="17" y2="13.6" stroke-linecap="round"/>
    <line x1="21" y1="13" x2="21" y2="13.6" stroke-linecap="round"/>
  `,
  // 粥 — bowl with spoon
  congee: `
    <path d="M6 18 Q6 26 16 26 Q26 26 26 18 Z"/>
    <line x1="5" y1="18" x2="27" y2="18"/>
    <line x1="20" y1="6" x2="14" y2="20"/>
    <ellipse cx="13" cy="21" rx="3" ry="1.5" transform="rotate(-25 13 21)"/>
  `,
  // 主菜 — serving cloche / dome
  main: `
    <path d="M4 22 Q16 6 28 22 Z"/>
    <line x1="2" y1="22" x2="30" y2="22"/>
    <line x1="16" y1="6" x2="16" y2="3"/>
    <circle cx="16" cy="3" r="1.3" fill="currentColor"/>
  `,
};
---
<svg
  viewBox="0 0 32 32"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  aria-hidden="true"
  set:html={PATHS[cat]}
/>
```

### `.start-screen` grid (in `index.astro` `<style>`)

```css
.start-screen {
  display: grid;
  grid-template-columns: repeat(4, var(--tile-unit));
  grid-auto-rows: var(--tile-unit);
  gap: var(--start-gap, 6px);
  justify-content: center;
  margin: 1rem auto 2rem;
  --tile-unit: clamp(72px, 18vw, 200px);
}
@media (min-width: 768px) { .start-screen { --start-gap: 8px; } }

/* Per-tile placement */
.start-screen .tile[data-cat="main"]        { grid-area: 1 / 1 / 3 / 5; }
.start-screen .tile[data-cat="rice"]        { grid-area: 3 / 1 / 5 / 3; }
.start-screen .tile[data-cat="noodle"]      { grid-area: 3 / 3 / 5 / 5; }
.start-screen .tile[data-cat="appetizer"]   { grid-area: 5 / 1 / 7 / 3; }
.start-screen .tile[data-cat="soup-noodle"] { grid-area: 5 / 3 / 6 / 4; }
.start-screen .tile[data-cat="baked-rice"]  { grid-area: 5 / 4 / 6 / 5; }
.start-screen .tile[data-cat="congee"]      { grid-area: 6 / 3 / 7 / 4; }
.start-screen .tile[data-cat="soup-wonton"] { grid-area: 6 / 4 / 7 / 5; }

/* Size variants — typography + content density */
.tile.size-w .tile-name  { font-size: 1.5rem; font-weight: 400; }
.tile.size-w .tile-count { font-size: 1rem; }
.tile.size-m .tile-name  { font-size: 0.95rem; font-weight: 400; }
.tile.size-m .tile-count { font-size: 0.75rem; opacity: 0.85; }
.tile.size-s .tile-name  { display: none; }
.tile.size-s .tile-count { display: none; }
.tile.size-s .tile-icon  { width: 32px; height: 32px; }
```

### 3D tilt press (in `BaseLayout.astro`)

CSS — replace existing `.wp-tile:active` block with:

```css
.wp-tile {
  transition: transform var(--fluent-duration-normal, 200ms) var(--fluent-curve-decelerate-mid, ease-out);
  will-change: transform;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
}
.wp-tile.pressing {
  transform: perspective(800px)
             rotateX(var(--tilt-x))
             rotateY(var(--tilt-y))
             scale(0.96);
  transition: transform 80ms var(--fluent-curve-accelerate-mid, ease-in);
}
@media (prefers-reduced-motion: reduce) {
  .wp-tile.pressing { transform: scale(0.97); }
}
```

JS (inline `<script>` in BaseLayout) — append AFTER the existing loading-bar script:

```js
// 3D tilt press — directional rotation toward press point (max 3deg + scale 0.96).
// Released on pointerup/cancel/leave. Doc-level delegation; per-tile setProperty.
(function setupTiltPress() {
  const MAX = 3;
  function press(tile, x, y) {
    const r = tile.getBoundingClientRect();
    const dx = (x - r.left - r.width / 2) / (r.width / 2);
    const dy = (y - r.top - r.height / 2) / (r.height / 2);
    tile.style.setProperty('--tilt-x', (-dy * MAX).toFixed(2) + 'deg');
    tile.style.setProperty('--tilt-y', (dx * MAX).toFixed(2) + 'deg');
    tile.classList.add('pressing');
  }
  function release() {
    document.querySelectorAll('.wp-tile.pressing').forEach((t) => t.classList.remove('pressing'));
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.wp-tile');
    if (t) press(t, e.clientX, e.clientY);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => document.addEventListener(ev, release));
})();
```

### Live Tile flip (in `index.astro`)

Only the WIDE main tile renders two `.face` elements (front and back). CSS:

```css
.tile.size-w { perspective: 1200px; }
.tile.size-w .face {
  position: absolute; inset: 0;
  padding: 1.25rem;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 0.8s var(--fluent-curve-easy-ease, cubic-bezier(0.6, 0, 0.2, 1));
}
.tile.size-w .face.back { transform: rotateX(180deg); }
.tile.size-w.flipped .face.front { transform: rotateX(180deg); }
.tile.size-w.flipped .face.back  { transform: rotateX(360deg); }
```

JS (inline `<script>` in `index.astro`, append after existing scripts if any):

```js
(function setupLiveTile() {
  const wide = document.querySelector('.tile.size-w');
  if (!wide) return;
  let timer = setInterval(flip, 8000);
  function flip() {
    if (document.hidden) return;
    if (wide.classList.contains('pressing')) return;
    wide.classList.toggle('flipped');
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else timer = setInterval(flip, 8000);
  });
})();
```

## Edge cases

| Case | Handling |
|---|---|
| `prefers-reduced-motion: reduce` | Tilt collapses to `scale(0.97)` (existing block from Phase 2 covers `.wp-tile:active`); flip transition still happens but is short. (Could be wrapped in another `prefers-reduced-motion` block to disable the flip entirely — left as a Phase 3.5 polish.) |
| Press on a flipped WIDE tile during flip | `.pressing` class disables the next flip toggle (see JS guard) |
| Live Tile flip while user navigates away (background tab) | `document.hidden` check pauses; `visibilitychange` resumes |
| Small tiles have no name visible — accessibility | `aria-label` on the `<a>` includes the localized name + count |
| Tile order in DOM differs from visual grid order (sort_order is appetizer→main but visual is main first) | Use DOM order = `sort_order` (matches Phase 2 categoryOrder helper). Visual order is purely CSS grid-area. Screen readers read sort_order order, which is fine semantically. |
| Inline SVG accessibility | All `<svg>` have `aria-hidden="true"` (decorative); the parent `<a>` has `aria-label` |

## Testing

- `pnpm build` succeeds (576 pages still — page count unchanged since no new routes)
- `pnpm test` — existing 5 vitest pass
- `pnpm check` — 0 type errors
- Manual smoke: open `/zh/`, `/en/`, `/yue/`. Verify:
  - Start Screen layout matches the size mapping table
  - Each tile shows the correct SVG icon (no emoji)
  - Pressing a tile shows directional 3D tilt (different corners tilt differently)
  - WIDE main tile flips every 8 seconds
  - Hover / click navigates to `/browse/<cat>` (regression check)

## Acceptance

Done when:

1. Homepage shows 4×6 Start Screen with correct tile sizing across all 3 locales
2. Pressing any `.wp-tile` (homepage tile OR dish-card OR locale switcher pivot-tab) shows directional 3D tilt
3. All 8 category emoji replaced with monoline SVG icons (no emoji left on homepage)
4. WIDE main tile flips every 8 seconds, displaying dictionary stats on the back
5. Existing tile→hero view-transition still works (Phase 1 regression-safe)
6. `pnpm build` clean; `pnpm test` 5/5 pass; `pnpm check` 0 errors
7. `docs/HANDOFF.md` updated; Phase 4-6 backlog still referenced in stub
8. Optional: `v0.3.0` tagged
