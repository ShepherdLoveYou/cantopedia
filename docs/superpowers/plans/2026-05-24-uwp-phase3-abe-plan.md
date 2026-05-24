# UWP Phase 3 (A + B + E) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the user-approved UWP prototype's Start Screen + 3D tilt press + monoline SVG icons + Live Tile flip from `docs/prototypes/2026-05-24-uwp-mock.html` (commit `b9a8b3c`) into the live Astro site.

**Architecture:** 1 new component (`CategoryIcon.astro`), 2 modified files (`index.astro`, `BaseLayout.astro`). No data changes. No new deps.

**Tech Stack:** Astro 5, pnpm, TypeScript strict, vitest. Same as Phase 2.

**Predecessor:** v0.2.0 (Phase 2 = pivot + morph + Fluent tokens, live at https://shepherdloveyou.github.io/cantopedia/).

**Spec:** [`docs/superpowers/specs/2026-05-24-uwp-phase3-abe-design.md`](../specs/2026-05-24-uwp-phase3-abe-design.md)

**Out of scope (Phase 4-6):** hamburger drawer + acrylic, dark/light dual mode, accent picker, bottom AppBar, photo-back Live Tile, A-Z search. See [`2026-05-24-uwp-phase3-design-stub.md`](../specs/2026-05-24-uwp-phase3-design-stub.md).

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `site/src/components/CategoryIcon.astro` | 8 monoline SVG icons (one per category) consumed by `cat` prop |
| Modify | `site/src/layouts/BaseLayout.astro` | Upgrade `.wp-tile:active` to 3D directional tilt; add tilt press script |
| Modify | `site/src/pages/[locale]/index.astro` | Replace `.tile-grid` with `.start-screen` 4×6 grid + size-variant tiles + CategoryIcon + Live Tile flip on WIDE main |
| Modify | `docs/HANDOFF.md` | Note v0.3.0 shipped after this plan executes |

---

### Task 1: Create CategoryIcon.astro

**Files:**
- Create: `site/src/components/CategoryIcon.astro`

- [ ] **Step 1: Write the file**

Create `site/src/components/CategoryIcon.astro` with the full contents below. The 8 monoline SVG paths are hand-drawn to be visually distinct yet share the same 32×32 viewBox + 1.4 stroke width.

```astro
---
interface Props {
  cat: 'appetizer' | 'soup-wonton' | 'rice' | 'noodle' | 'soup-noodle' | 'baked-rice' | 'congee' | 'main';
  size?: number;
}
const { cat, size = 32 } = Astro.props;

const PATHS: Record<Props['cat'], string> = {
  appetizer: `
    <path d="M8 14 H22 V20 Q22 24 16 24 Q10 24 10 20 Z"/>
    <line x1="22" y1="16" x2="25" y2="16"/>
    <path d="M25 16 Q27 18 25 20"/>
    <path d="M13 8 Q13 12 14 12"/>
    <path d="M16 8 Q16 12 17 12"/>
    <path d="M19 8 Q19 12 20 12"/>
  `,
  'soup-wonton': `
    <path d="M5 18 Q5 26 16 26 Q27 26 27 18 Z"/>
    <line x1="4" y1="18" x2="28" y2="18"/>
    <circle cx="11" cy="22" r="1.6"/>
    <circle cx="16" cy="22" r="1.6"/>
    <circle cx="21" cy="22" r="1.6"/>
  `,
  rice: `
    <path d="M4 16 Q4 24 16 26 Q28 24 28 16 Z"/>
    <line x1="3" y1="16" x2="29" y2="16"/>
    <circle cx="10" cy="20" r="0.7" fill="currentColor"/>
    <circle cx="16" cy="22" r="0.7" fill="currentColor"/>
    <circle cx="22" cy="20" r="0.7" fill="currentColor"/>
    <circle cx="13" cy="18" r="0.7" fill="currentColor"/>
    <circle cx="19" cy="18" r="0.7" fill="currentColor"/>
  `,
  noodle: `
    <path d="M4 10 Q10 6 16 10 T28 10"/>
    <path d="M4 16 Q10 12 16 16 T28 16"/>
    <path d="M4 22 Q10 18 16 22 T28 22"/>
  `,
  'soup-noodle': `
    <path d="M5 18 Q5 26 16 26 Q27 26 27 18 Z"/>
    <line x1="4" y1="18" x2="28" y2="18"/>
    <path d="M8 22 Q12 20 16 22 T24 22"/>
  `,
  'baked-rice': `
    <rect x="6" y="10" width="20" height="16" fill="none"/>
    <line x1="6" y1="16" x2="26" y2="16"/>
    <line x1="9" y1="13" x2="9" y2="13.6" stroke-linecap="round"/>
    <line x1="13" y1="13" x2="13" y2="13.6" stroke-linecap="round"/>
    <line x1="17" y1="13" x2="17" y2="13.6" stroke-linecap="round"/>
    <line x1="21" y1="13" x2="21" y2="13.6" stroke-linecap="round"/>
  `,
  congee: `
    <path d="M6 18 Q6 26 16 26 Q26 26 26 18 Z"/>
    <line x1="5" y1="18" x2="27" y2="18"/>
    <line x1="20" y1="6" x2="14" y2="20"/>
    <ellipse cx="13" cy="21" rx="3" ry="1.5" transform="rotate(-25 13 21)"/>
  `,
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

- [ ] **Step 2: Type-check** (component isn't imported yet, so build won't validate it; use `pnpm check`)

```bash
cd "d:/Cantonese Cuisine/site" && pnpm check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/components/CategoryIcon.astro && git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
WP10 phase 3 — CategoryIcon: 8 monoline SVG glyphs for categories

Hand-drawn outline icons (1.4 stroke, 32x32 viewBox) replacing the
existing emoji glyphs (🥟/🥣/🍚/🍜/🍲/🧀/🥄/🍖). Each category
gets a visually distinct silhouette: teacup, bowl with wontons,
rice with grain dots, noodle strands, soup with noodle squiggle,
oven box, bowl with spoon, serving dome.

Not wired to any page yet — index.astro pickup lands in a later task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Upgrade `.wp-tile:active` to 3D directional tilt press

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Find the existing `.wp-tile` and `.wp-tile:active` rules**

Open `site/src/layouts/BaseLayout.astro`. Find inside the `<style is:global>` block the existing rules (around line 230-240):

```css
.wp-tile {
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.wp-tile:active {
  transform: scale(0.96) !important;
  transition: transform 0.08s ease-out;
}
```

- [ ] **Step 2: Replace those two rules with the 3D tilt versions**

REPLACE them with:

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
```

(Note we now key off `.pressing` class instead of `:active`. The pre-existing `prefers-reduced-motion` block on line ~244 referenced `.wp-tile:active`; update it too.)

- [ ] **Step 3: Update the reduced-motion guard for tile press**

Find inside the `@media (prefers-reduced-motion: reduce)` block (around line 244):

```css
.wp-tile:active { transform: none !important; }
```

REPLACE with:

```css
.wp-tile.pressing { transform: scale(0.97); }
```

- [ ] **Step 4: Append the tilt press script**

In the same `BaseLayout.astro`, find the existing `<script>` block (the one that handles `loading-bar` around line 50-60). Append this new IIFE after the existing loading-bar script, INSIDE the same `<script>` tag (or in a new `<script>` tag at the end of body, before `</body>`):

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

- [ ] **Step 5: Build + check**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build && pnpm check
```

Expected: build succeeds. 0 type errors.

- [ ] **Step 6: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/layouts/BaseLayout.astro && git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
WP10 phase 3 — 3D directional tilt press for .wp-tile

Replace scale-only :active with .pressing-class-driven perspective +
rotateX/rotateY toward the press point (max 3deg + scale 0.96).
Doc-level pointerdown delegation sets --tilt-x / --tilt-y custom
properties. Released on pointerup/cancel/leave. reduced-motion still
honored via fallback scale(0.97).

Affects all .wp-tile elements site-wide: homepage tiles, dish-cards,
locale switcher pivot-tabs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Redesign homepage to Start Screen with CategoryIcon + size variants

**Files:**
- Modify: `site/src/pages/[locale]/index.astro`

- [ ] **Step 1: Import CategoryIcon and remove the emoji glyph map**

Open `site/src/pages/[locale]/index.astro`. In the frontmatter:

1. Add this import after the existing `import BaseLayout ...` line:

```astro
import CategoryIcon from '~/components/CategoryIcon.astro';
```

2. Find the `tileGlyphs` const (around line 40-43) and DELETE the entire `const tileGlyphs: Record<string, string> = { ... };` block.

3. Add a new const that maps `cat.id` to size class:

```astro
// Tile size mapping: dishes >=20 -> WIDE, 7-19 -> MEDIUM, <7 -> SMALL.
function sizeOf(catId: string, dishCount: number): 'w' | 'm' | 's' {
  if (dishCount >= 20) return 'w';
  if (dishCount >= 7) return 'm';
  return 's';
}
```

- [ ] **Step 2: Replace the tile-grid template with start-screen**

In the template, find the existing `<div class="tile-grid">...</div>` block (around lines 112-137). REPLACE the entire block with:

```astro
  <div class="start-screen">
    {sortedCategories.map((cat) => {
      const inCat = dishesByCategory.get(cat.id) ?? [];
      if (inCat.length === 0) return null;
      const catName = locale === 'en' ? cat.data.names.en : cat.data.names.yue_hant;
      const desc = locale === 'en'
        ? (cat.data.description.en ?? cat.data.description.zh)
        : locale === 'yue'
          ? (cat.data.description.yue ?? cat.data.description.zh)
          : cat.data.description.zh;
      const tileColor = tileColors[cat.id] || '#37474F';
      const size = sizeOf(cat.id, inCat.length);
      const isWide = size === 'w';
      return (
        <a
          class={`tile wp-tile size-${size}`}
          href={`${base}/${locale}/browse/${cat.id}`}
          data-cat={cat.id}
          aria-label={`${catName} (${inCat.length} ${dict.pieces})`}
          style={`background: ${tileColor}; view-transition-name: tile-${cat.id};`}
        >
          {isWide ? (
            <>
              <div class="face front">
                <CategoryIcon cat={cat.id as any} size={56} />
                <div class="tile-name">{catName}</div>
                <div class="tile-count">{inCat.length} {dict.pieces}</div>
              </div>
              <div class="face back" aria-hidden="true">
                <div class="back-label">{locale === 'en' ? 'CANTOPEDIA · STATS' : '粵食典 · 數據'}</div>
                <div class="back-num">{total}</div>
                <div class="back-tagline">{
                  locale === 'en'
                    ? `${total} dishes · 8 categories · tri-lingual`
                    : `${total} 道菜 · 8 大類 · 三語可溯`
                }</div>
              </div>
            </>
          ) : (
            <>
              <CategoryIcon cat={cat.id as any} size={size === 's' ? 32 : 28} class="tile-icon" />
              <span class="tile-badge">{inCat.length}</span>
              <div class="tile-name">{catName}</div>
            </>
          )}
        </a>
      );
    })}
  </div>
```

Note: the `<CategoryIcon ... class="tile-icon" />` syntax — Astro forwards `class` to the rendered `<svg>` via spread. If that doesn't work in your Astro version, wrap the `<CategoryIcon>` in a `<div class="tile-icon">...</div>`.

- [ ] **Step 3: Replace the old `.tile-grid` / `.tile` CSS with start-screen CSS**

In the `<style>` block, REPLACE the entire existing block from `.tile-grid {` (line ~192) down to and including the `.tile-chev { ... }` rule (line ~268) and the mobile breakpoint at the end. Replace with:

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
  @media (min-width: 768px) {
    .start-screen { --start-gap: 8px; }
  }

  /* Per-tile placement */
  .start-screen .tile[data-cat="main"]        { grid-area: 1 / 1 / 3 / 5; }
  .start-screen .tile[data-cat="rice"]        { grid-area: 3 / 1 / 5 / 3; }
  .start-screen .tile[data-cat="noodle"]      { grid-area: 3 / 3 / 5 / 5; }
  .start-screen .tile[data-cat="appetizer"]   { grid-area: 5 / 1 / 7 / 3; }
  .start-screen .tile[data-cat="soup-noodle"] { grid-area: 5 / 3 / 6 / 4; }
  .start-screen .tile[data-cat="baked-rice"]  { grid-area: 5 / 4 / 6 / 5; }
  .start-screen .tile[data-cat="congee"]      { grid-area: 6 / 3 / 7 / 4; }
  .start-screen .tile[data-cat="soup-wonton"] { grid-area: 6 / 4 / 7 / 5; }

  .tile {
    position: relative;
    display: block;
    color: white !important;
    text-decoration: none;
    cursor: pointer;
    overflow: hidden;
    padding: 10px;
  }
  .tile:hover { color: white !important; }

  /* Icon positions per size */
  .tile.size-w .face .tile-name  { font-size: 1.5rem; font-weight: 400; margin-top: 0.5rem; }
  .tile.size-w .face .tile-count { font-size: 0.95rem; opacity: 0.85; margin-top: 0.15rem; letter-spacing: 0.04em; }

  .tile.size-m { padding: 12px; }
  .tile.size-m .tile-icon { position: absolute; top: 10px; left: 10px; }
  .tile.size-m .tile-name { position: absolute; bottom: 8px; left: 10px; right: 10px;
                            font-size: 0.85rem; font-weight: 400; letter-spacing: 0.02em; }

  .tile.size-s .tile-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .tile.size-s .tile-name { display: none; }

  .tile-badge {
    position: absolute;
    top: 6px; right: 8px;
    padding: 1px 6px;
    background: rgba(255, 255, 255, 0.18);
    font-size: 0.7rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }
  .tile.size-s .tile-badge { display: none; }

  /* Live Tile flip — WIDE main only */
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

  .tile.size-w .face.back .back-label { font-size: 0.7rem; letter-spacing: 0.22em; opacity: 0.7; font-weight: 500; }
  .tile.size-w .face.back .back-num   { font-size: 3.5rem; font-weight: 200; line-height: 1.1; margin: 0.25rem 0; }
  .tile.size-w .face.back .back-tagline { font-size: 0.85rem; opacity: 0.85; max-width: 280px; }

  @media (max-width: 640px) {
    .hero { padding: 2.5rem 1.5rem 2.5rem; }
    .hero-title { font-size: 3.5rem; }
  }
```

- [ ] **Step 4: Append the Live Tile flip script**

In the `<script>` block at the end of the file (if absent, add `<script>...</script>` before the closing `</BaseLayout>` element won't work — Astro scripts go in the body). Actually, append a new `<script>` block AFTER the `<BaseLayout>` closing tag isn't correct either; for Astro components, top-level `<script>` inside the .astro file is fine. Append at the very end of the file (after the closing `</style>`):

```astro
<script>
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
</script>
```

- [ ] **Step 5: Build + check**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build && pnpm check
```

Expected: build succeeds. 0 type errors. 576 pages still generate.

- [ ] **Step 6: Commit**

```bash
git -C "d:/Cantonese Cuisine" add site/src/pages/\[locale\]/index.astro && git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
WP10 phase 3 — homepage Start Screen + Live Tile flip

Replace uniform tile-grid with 4-column explicit Start Screen.
Tile size mapping by dish count: WIDE main (22), MEDIUM rice/noodle/
appetizer (7-11), SMALL soup-wonton/soup-noodle/baked-rice/congee (3-5).
Per-tile grid-area placement.

Drop emoji glyphs, use CategoryIcon monoline SVGs.

Add Live Tile flip on the WIDE main tile: X-axis flip every 8s,
front = icon + name + count, back = dictionary stats (66 道菜 / 8 大類 /
三語可溯). Pauses on document.hidden or .pressing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Smoke test

**No file changes. Verification.**

- [ ] **Step 1: Build clean**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm build
```

Expected: 576 pages, 0 errors.

- [ ] **Step 2: Tests still pass**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm test
```

Expected: 5/5 vitest pass.

- [ ] **Step 3: Type-check**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm check
```

Expected: 0 errors.

- [ ] **Step 4: Manual smoke in browser (controller / human)**

```bash
cd "d:/Cantonese Cuisine/site" && pnpm dev
```

Open `http://localhost:4321/cantopedia/zh/` and verify:

| # | Path | Expected |
|---|---|---|
| 1 | Homepage shows 1 large 主菜 tile, 3 medium tiles (rice / noodle / 茶水), 4 small tiles | Matches the Start Screen size mapping |
| 2 | Each tile shows a monoline SVG icon (no emoji) | 8 distinct line-art glyphs |
| 3 | Press a tile (hold mouse down) in different corners | Tile tilts toward press point (different corners tilt different directions); scale ~0.96 |
| 4 | Wait 8 seconds on homepage | WIDE main tile flips X-axis; shows "66" + "粵食典 · 數據" + tagline |
| 5 | Click any homepage tile | Tile color expands into cat-hero (Phase 1 regression check) |
| 6 | Switch to `/en/` and `/yue/` | Layout identical; back-tagline + names in correct locale |

- [ ] **Step 5: No commit (smoke only)**

If any path fails, fix in the relevant earlier task and re-smoke.

---

### Task 5: Update HANDOFF.md + tag + push

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Update version line and add Phase 3 SHIPPED section**

Open `docs/HANDOFF.md`. Find:
```markdown
- **Release tag**: `v0.2.0` (planned after this push)
```
Replace with:
```markdown
- **Release tag**: `v0.3.0` (planned after this push)
```

Find the `### WP10 polish v2 — Phase 2 SHIPPED` heading and AFTER its content (before the next `## ...` heading), insert:

```markdown

### UWP polish v3 — Phase 3 (A+B+E) SHIPPED

Implemented per spec `docs/superpowers/specs/2026-05-24-uwp-phase3-abe-design.md`:

- **Start Screen homepage** — 4×6 explicit grid: 1 WIDE main (22), 3 MEDIUM (rice/noodle/appetizer), 4 SMALL (soup-wonton/soup-noodle/baked-rice/congee). Size mapping by dish count (≥20/7-19/<7).
- **3D directional tilt press** — `.wp-tile` upgraded site-wide. Press point computed in JS (max 3° rotation + scale 0.96). Replaces v1's scale-only press.
- **Monoline SVG icons** — 8 hand-drawn category glyphs in `CategoryIcon.astro` replace emoji.
- **Live Tile flip** — WIDE main tile flips X-axis every 8s; back face shows dictionary stats.

Files added: `site/src/components/CategoryIcon.astro`. Files modified: `BaseLayout.astro` (tilt CSS + script), `pages/[locale]/index.astro` (Start Screen layout + Live Tile flip).
```

- [ ] **Step 2: Update the Phase 3 backlog header**

Find `## WP10 polish — still TODO (Phase 3 — see prototype)`. Update to:
```markdown
## WP10 polish — still TODO (Phase 4+ — see prototype)
```

(Phase 3 is now done; remaining items are Phase 4+: drawer, dark mode, accent, AppBar, photo flip, A-Z search.)

- [ ] **Step 3: Commit**

```bash
git -C "d:/Cantonese Cuisine" add docs/HANDOFF.md && git -C "d:/Cantonese Cuisine" commit -m "$(cat <<'EOF'
HANDOFF: Phase 3 (A+B+E) shipped — Start Screen + tilt + SVG + flip

v0.3.0 ships Start Screen homepage, 3D tilt, monoline icons, Live Tile
flip. Phase 4+ backlog: hamburger drawer, dark/light, accent picker,
AppBar, photo flip, A-Z search.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push (auto-deploys)**

```bash
git -C "d:/Cantonese Cuisine" push origin main
```

- [ ] **Step 5: Verify deploy + smoke live**

```bash
gh -R ShepherdLoveYou/cantopedia run list --limit 2 && gh -R ShepherdLoveYou/cantopedia run watch
```

When done, open `https://shepherdloveyou.github.io/cantopedia/zh/` and smoke paths 1-6 from Task 4 step 4.

- [ ] **Step 6 (optional): Tag v0.3.0**

```bash
git -C "d:/Cantonese Cuisine" tag -a v0.3.0 -m "UWP phase 3: Start Screen + 3D tilt + monoline icons + Live Tile flip" && git -C "d:/Cantonese Cuisine" push origin v0.3.0
```

---

## Done definition

All boxes checked, plus:
1. Homepage renders Start Screen layout in all 3 locales
2. All 8 categories show SVG icons (no emoji)
3. Tile press shows directional 3D tilt (cornered tilt different per press point)
4. WIDE main tile flips every 8 seconds
5. Existing tile→hero transition still works (v1 regression-safe)
6. `pnpm build` clean, `pnpm test` 5/5 pass, `pnpm check` 0 errors
7. Production site reflects new layout
8. v0.3.0 tag pushed

## Risks during execution

| Risk | Mitigation |
|---|---|
| `<CategoryIcon class="tile-icon" />` — Astro may not forward `class` to the rendered `<svg>` | If `pnpm check` complains or visual smoke shows misaligned icons, wrap `<CategoryIcon>` in `<div class="tile-icon">...</div>` and adjust CSS |
| Start Screen breaks pre-existing tile→hero transition (the existing `view-transition-name: tile-{cat.id}` on each tile must be preserved) | Spec keeps this attribute on each `.tile`. Verify in browser DevTools Elements panel before push |
| Flip animation conflicts with tilt press (both touch transform) | Live Tile flip touches `.face` children, not the `.tile` itself. Tilt touches `.tile`. No conflict in stacking. |
| SVG `set:html` requires trusted input | All 8 paths are hardcoded literals — safe |
| `prefers-reduced-motion` doesn't disable flip | Acceptable for now; can add a guard in Phase 3.5 if needed |

## Out of scope (Phase 4+)

See [`2026-05-24-uwp-phase3-design-stub.md`](../specs/2026-05-24-uwp-phase3-design-stub.md):
- Hamburger drawer + acrylic blur
- Dark / Light dual mode + accent color picker + bottom AppBar
- Wide-tile photo flip (depends on dish images pipeline)
- A-Z jumping grid search
- Continuum dominos page transitions
- WP10 segmented arrows, ripple, marquee
- Community contribution flow
- Ingredient enrichment
