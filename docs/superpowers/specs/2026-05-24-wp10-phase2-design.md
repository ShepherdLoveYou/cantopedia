# WP10 Polish Phase 2 — Design Spec

**Date:** 2026-05-24
**Author:** brainstormed with Claude
**Branch target:** `main` (small enough to land directly)
**Predecessor work:** commit `cce14fc` (WP10 polish v1: ClientRouter, top loading bar, tile→hero shared element, `.wp-tile:active` press)

## Goal

Continue WP10 Metro UX work begun in v1 by adding the two highest-impact items from the Phase 2 backlog:

1. **dish-card → dish-hero shared element morph** — when a user taps a dish card on a category browse page, the card itself morphs into the colored hero band on the dish detail page.
2. **Horizontal Hub-pane navigation** — the `/browse/<category>` pages get a WP10-authentic "three-peek" pivot strip at the top. Users can flick (touch swipe), press `←/→`, or click the dim neighbor titles to navigate between categories without leaving the browse pattern.

Items explicitly out of scope: live-tile flip, segmented back/forward arrows, ripple, marquee text, any image work, any non-WP10-Phase-2 polish.

## Decisions made during brainstorming

| # | Decision | Rejected alternatives |
|---|---|---|
| 1 | Keep individual `/browse/<category>` pages and add a horizontal pivot strip on top | (A) Mega-Hub one-page replacement (SEO regression, kills existing routes); (C) homepage-only multi-pane Hub (didn't address category navigation) |
| 2 | Pivot strip = WP10-authentic "three-peek" (current large, ±1 neighbor dim) | Full 8-tab strip (uses-too-much WP10 identity); rounded chip strip (Material/iOS feel, off-brand) |
| 3 | Shared element pairing = **whole card → whole hero band** | Name-only morph (visually lonely); name + menu-no two-pair (less dramatic than full card) |
| 4 | Pivot navigation interactions: **click peek + keyboard ←/→ + touch swipe** | Mouse wheel rejected (vertical scroll conflict, accidental triggers) |
| 5 | Hand-roll the pivot CSS + JS (≈ 60 LOC) | Pulling in [olton/metroui](https://github.com/olton/metroui) — checked, library has 166 components but no pivot/hub/panorama. Keep metroui in our back pocket for live-tile flip later (`flip-card` component). |

## Architecture

### Files to add

| File | Purpose | Approx LOC |
|---|---|---|
| `site/src/components/CategoryPivot.astro` | 3-peek pivot strip; inline `<script>` for keyboard + touch swipe | ~80 (template + style + script) |
| `site/src/lib/categoryOrder.ts` | `getPivotNeighbors(currentId, allCategories) → {prev, curr, next}`; circular ordering by `sort_order` | ~25 |

### Files to modify

| File | Change |
|---|---|
| `site/src/layouts/BaseLayout.astro` | Add global `@media (prefers-reduced-motion: reduce)` CSS guard that disables all view-transition animations. Add `nav-prev`/`nav-next` class toggling on `<html>` so CSS can pick directional slide keyframes. |
| `site/src/pages/[locale]/browse/[category].astro` | (a) Render `<CategoryPivot>` above the cat-hero. (b) Inject `--cat-color` CSS variable and a `border-top: 6px solid var(--cat-color)` on each `.dish-card`. (c) Add `style="view-transition-name: dish-{dish.id}"` to each `.dish-card`. |
| `site/src/pages/[locale]/dishes/[id].astro` | Add `view-transition-name: dish-{dish.id}` to the `hero-band` element. |

No data-model, schema, or pipeline changes. No new dependencies.

## Component design

### Pivot strip (`<CategoryPivot>`)

```astro
---
import { getPivotNeighbors } from '~/lib/categoryOrder';
import { getCollection } from 'astro:content';

const { currentId, locale } = Astro.props;
const all = await getCollection('category');
const { prev, curr, next } = getPivotNeighbors(currentId, all);
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const nameOf = (c) => locale === 'en' ? c.data.names.en : c.data.names.yue_hant;
---
<nav class="pivot-strip" aria-label="Category pivot">
  <a class="pivot pivot--dim"
     href={`${base}/${locale}/browse/${prev.id}`}
     data-dir="prev"
     rel="prev">{nameOf(prev)}</a>
  <h1 class="pivot pivot--current"
      style="view-transition-name: pivot-title">{nameOf(curr)}</h1>
  <a class="pivot pivot--dim"
     href={`${base}/${locale}/browse/${next.id}`}
     data-dir="next"
     rel="next">{nameOf(next)}</a>
</nav>

<script>
  // ClientRouter keeps document-level listeners across navigations, so each
  // handler bails fast on pages where the pivot strip isn't present.
  const hasPivot = () => !!document.querySelector('.pivot-strip');

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (!hasPivot()) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowLeft')  document.querySelector<HTMLAnchorElement>('.pivot[data-dir="prev"]')?.click();
    if (e.key === 'ArrowRight') document.querySelector<HTMLAnchorElement>('.pivot[data-dir="next"]')?.click();
  });

  // Touch swipe — horizontal only, threshold 60px and 2× more horizontal than vertical
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', (e) => {
    if (!hasPivot()) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!hasPivot()) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    const dir = dx < 0 ? 'next' : 'prev';
    document.querySelector<HTMLAnchorElement>(`.pivot[data-dir="${dir}"]`)?.click();
  }, { passive: true });

  // Tag direction onto <html> for CSS-driven slide (capture phase so it runs
  // before ClientRouter intercepts the click). No hasPivot bail needed —
  // the selector itself only matches pivot anchors.
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('.pivot[data-dir]');
    if (!a) return;
    document.documentElement.classList.remove('nav-prev', 'nav-next');
    document.documentElement.classList.add(a.dataset.dir === 'prev' ? 'nav-prev' : 'nav-next');
  }, true);
</script>

<style>
  .pivot-strip {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: baseline;
    gap: 1.5rem;
    padding: 1.5rem 0 0.5rem;
    font-family: var(--serif-zh);
  }
  .pivot { text-decoration: none; color: inherit; }
  .pivot--dim {
    font-size: 1.125rem;
    opacity: 0.42;
    transition: opacity .15s;
  }
  .pivot--dim:hover { opacity: 0.7; }
  .pivot--dim[data-dir="prev"] { text-align: right; }
  .pivot--current {
    font-size: 2.5rem;
    font-weight: 500;
    margin: 0;
    line-height: 1;
  }
</style>
```

### Circular neighbors helper (`categoryOrder.ts`)

```ts
import type { CollectionEntry } from 'astro:content';
type Cat = CollectionEntry<'category'>;

export function getPivotNeighbors(currentId: string, all: Cat[]) {
  const sorted = [...all].sort((a, b) => a.data.sort_order - b.data.sort_order);
  const i = sorted.findIndex((c) => c.id === currentId);
  if (i < 0) throw new Error(`Category ${currentId} not found`);
  const n = sorted.length;
  return {
    prev: sorted[(i - 1 + n) % n],
    curr: sorted[i],
    next: sorted[(i + 1) % n],
  };
}
```

### dish-card change in `browse/[category].astro`

Inline `--cat-color` and `view-transition-name`:

```astro
<a class="dish-card wp-tile"
   href={`${base}/${locale}/dishes/${dish.id}`}
   style={`--cat-color: ${tileColor}; view-transition-name: dish-${dish.id};`}>
   ...
</a>
```

CSS addition:
```css
.dish-card {
  border-top: 6px solid var(--cat-color);
  /* existing rules unchanged */
}
```

### hero-band change in `dishes/[id].astro`

```astro
<header class="hero-band" style={`background: ${catColor}; view-transition-name: dish-${dish.id};`}>
```

### Directional slide CSS (in `BaseLayout.astro`)

```css
/* Default ClientRouter cross-fade unchanged for vertical paths */

/* Pivot horizontal slide — only when <html> has nav-next / nav-prev */
html.nav-next::view-transition-old(root) { animation: slide-out-left  .28s ease both; }
html.nav-next::view-transition-new(root) { animation: slide-in-right  .28s ease both; }
html.nav-prev::view-transition-old(root) { animation: slide-out-right .28s ease both; }
html.nav-prev::view-transition-new(root) { animation: slide-in-left   .28s ease both; }

@keyframes slide-out-left  { to { transform: translateX(-12%); opacity: 0; } }
@keyframes slide-in-right  { from { transform: translateX(12%);  opacity: 0; } }
@keyframes slide-out-right { to { transform: translateX(12%);   opacity: 0; } }
@keyframes slide-in-left   { from { transform: translateX(-12%); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Note: `nav-next`/`nav-prev` class set on `<html>` BEFORE click is captured (ClientRouter starts the transition synchronously on click). Class is cleared at the start of the next pageload by removing both classes in the same click-handler (next click resets).

## Shared-element pairings — full table

| view-transition-name | Where set | Used by which navigation |
|---|---|---|
| `tile-{cat.id}` | `cat-hero` on browse pages (already exists) and category tile on homepage | Home → /browse/{cat} only |
| `dish-{dish.id}` | `.dish-card` on browse, `.hero-band` on dish detail | /browse/{cat} → /dishes/{id} only |
| `pivot-title` | `.pivot--current` heading | /browse/{a} ↔ /browse/{b} (pivot nav) |
| (none) | `.cat-hero` between pivot navigations | Cross-fades naturally (different tile-{id}); intentional |

## Edge cases and how each is handled

| Case | Handling |
|---|---|
| `prefers-reduced-motion: reduce` | Global CSS guard kills all view-transition animations; navigation still works, just instant |
| No JavaScript | Pivot dim anchors are plain `<a>` and continue to work. Swipe + keyboard inert. ClientRouter falls back to full-page nav. No broken state. |
| Browser without View Transitions API (Chrome <111, Safari <18, Firefox <138) | ClientRouter feature-detects; falls back to instant navigation. No content broken. |
| Vertical scroll on mobile mistaken for swipe | Swipe threshold: `|Δx| ≥ 60px` AND `|Δx| ≥ 2·|Δy|`. Don't `preventDefault` until threshold met (otherwise vertical scroll breaks). |
| Keyboard `←/→` inside form field | Pre-check `e.target.tagName ∈ {INPUT, TEXTAREA, SELECT}` and bail. (Currently no forms on browse pages, but future-proof.) |
| Browser back button after pivot nav | Standard History API behavior. Backwards nav also triggers view transition; no slide direction class, so it cross-fades. Acceptable. |
| SEO — search engines indexing pivot | Pivot adds 2 extra internal links per browse page → richer crawl graph, not poorer. No content moves to JS. |
| Multiple dishes with same view-transition-name on different pages | Each `dish-{dish.id}` is per-dish unique. No collision. |
| Reload mid-navigation | ClientRouter aborts cleanly; full reload renders the destination URL as-is. |

## Testing

### Unit / build verification
- `cd site && pnpm build` succeeds (576+ static pages still generate)
- `cd pipeline && python -m pipeline validate` succeeds (no data touched, but standard precommit habit)
- No new TypeScript errors

### Manual smoke (local `pnpm dev` at `http://localhost:4321/cantopedia/`)
- [ ] Home tile → browse: tile color expands into cat-hero (existing, regression check)
- [ ] Browse dish-card → dish detail: card morphs into hero-band; 6px top stripe grows into full band
- [ ] Browse → previous category (click left dim title): horizontal slide-right; pivot title morphs
- [ ] Browse → next category (click right dim title): horizontal slide-left; pivot title morphs
- [ ] Browse → next category via keyboard `→`: same as click
- [ ] Browse → previous via keyboard `←`: same as click
- [ ] Browse → next via touch swipe-left (DevTools mobile mode): same as click
- [ ] Vertical scroll on mobile-emulated browse page: NOT mistaken for swipe
- [ ] Browser back button after pivot nav: returns to previous category, no errors
- [ ] All three locales `/zh`, `/en`, `/yue`: pivot strip shows correct localized names

### Browser smoke
- [ ] Chrome current
- [ ] Safari current (or Safari Tech Preview if 18 unavailable on Win)
- [ ] Firefox current
- [ ] In all: with View Transitions disabled (about:config or DevTools), site still works (instant nav)

### Accessibility
- [ ] DevTools Rendering → "Emulate CSS prefers-reduced-motion: reduce": all transitions instant
- [ ] Keyboard-only navigation from browse: Tab to next dim title, Enter activates
- [ ] Screen reader announces pivot strip as nav with aria-label

### Performance
- Bundle size impact: ~80 LOC inline in component (no new npm deps) → negligible (~2 KB pre-gzip)

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| view-transition on `dish-{id}` collides with persistent layout elements (nav, loading bar) | These already have their own `view-transition-name` from v1; verified non-overlapping namespace |
| Swipe gesture conflicts with iOS edge-swipe-to-back | iOS reserves the screen-edge 20px; our 60px threshold + center-of-content trigger should not conflict, but flag during Safari testing |
| Card top stripe (6px) looks tacked-on | Use catColor matched to existing `tileColors` map → consistent with the rest of the site's color language. If still ugly, fall back to `box-shadow inset 0 4px 0 var(--cat-color)` for an inset feel. |
| ClientRouter from v1 doesn't expose hook to set direction class before transition starts | Setting class on click (capture phase, line above) runs before ClientRouter's own handler. If timing is wrong during implementation, fall back to `window.navigation` API or `astro:before-preparation` event. |
| Document-level listeners persist across ClientRouter navigations and would fire on non-browse pages | Each handler early-returns with `if (!hasPivot()) return;`. Direction-tagging click handler doesn't need it because its selector only matches `.pivot[data-dir]` anchors. |

## Acceptance criteria

The work is complete when:

1. All 8 categories' `/browse/<cat>` pages show the 3-peek pivot strip in all three locales.
2. Pivot strip is navigable by click, keyboard `←/→`, and touch swipe.
3. Clicking any `.dish-card` morphs the card into the dish-detail hero-band.
4. `prefers-reduced-motion: reduce` reliably disables all morph/slide animations.
5. `pnpm build` passes; `python -m pipeline validate` passes.
6. Manual smoke list above all green in Chrome.
7. Deploy workflow runs on push (auto-triggered because `site/` changed).
8. `docs/HANDOFF.md` updated noting Phase 2 items 1+2 done; remaining (live-tile flip, arrows, ripple, marquee) explicitly carried forward.

## Out of scope (defer to later sessions)

- Live-tile flip animation (Phase 2 item 3) — when picked up, prefer `metroui` `flip-card` component first
- WP10 segmented back/forward arrows (Phase 2 item 4)
- Tap ripple (Phase 2 item 5)
- Marquee text on overflow tile names (Phase 2 item 6)
- Dish images
- Pagefind search UI
- Ingredient stub enrichment
- Community contribution flow

## Open questions for review

None blocking. Possible follow-up if anything looks off during implementation:
- If the 6px catColor top stripe on dish-cards looks tacked-on, switch to inset shadow or skip the visual and rely on pure crossfade.
- If horizontal slide direction class on `<html>` proves fragile because ClientRouter intercepts before capture-phase handler runs, switch to `astro:before-preparation` event listener instead.
