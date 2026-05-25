# Handoff — Cantopedia Hub Pattern Refactor

**Date:** 2026-05-25
**Branch:** main (deployed)
**Live:** https://shepherdloveyou.github.io/cantopedia
**Last commit:** `502ab7b` (stage 2 hub) — pushed and deployed

## TL;DR for the next window

Cantopedia just shifted its core nav UX from per-page `/browse/[category]` routes with View-Transitions slide animations to a **9-panel horizontal Hub** (Windows Phone 10 hub style):
- 1 home panel + 8 category panels live in one DOM
- All `/[locale]/` and `/[locale]/browse/[category]` URLs render the SAME hub body — only `<title>` meta + initial scroll position differ
- Pivot prev/next = native CSS `scroll-snap` + `scrollTo({behavior:'smooth'})` + `history.replaceState()`
- Touch swipe is native CSS scroll-snap
- **Measured 60fps, 0 long frames** vs old VT-slide (33ms p95, 4 long frames)

Detail pages (dishes, sauces, ingredients) are unchanged — they stay as separate routes, click-through from hub still uses View Transitions for the tile-zoom morph.

## What problem this solved

User reported: "翻倒屏幕外了，然后再切到下一页，非常不自然" + "动画非常卡". I tried 4 successive fixes to the VT slide (class propagation through swap, defer class removal, suppress per-element VT names, mix-blend-mode override) — each got closer but **the fundamental issue was sync DOM swap during animation**. Hub Pattern eliminates the DOM swap entirely. Detailed perf data and root-cause traces are in `docs/superpowers/specs/2026-05-25-wp10-metro-refresh-design.md` and the handoff log above.

## Architecture map

```
site/src/components/Hub.astro                   ← NEW. Renders 9 panels + pivot
site/src/pages/[locale]/index.astro             ← thin: <Hub initialPanel="home" />
site/src/pages/[locale]/browse/[category].astro ← thin: <Hub initialPanel={cat.id} />
site/src/components/CategoryPivot.astro         ← unused now; still in repo (see Cleanup)
```

The Hub component owns:
- All hub HTML structure
- Hub pivot UI (`<nav class="hub-pivot">` with prev/next arrows + title)
- All CSS for `.hub`, `.hub-panel`, `.cat-hero`, `.dish-grid`, `.dish-card`, `.start-screen`, `.featured-tile`, `.stat-tiles`, `.live-tile-face`, `.panorama`
- Inline scripts:
  - **Hub nav script**: scroll-snap detection via `IntersectionObserver(threshold: 0.5)`, `updatePivot()` writes pivot title + `document.title` + `history.replaceState()`
  - **Featured Tile rotator**: 6s setInterval through 3 faces (today/random/recent) — was on home page, now inlined in Hub
  - **Dish-card live-tile flip**: 10s period × 1.4s stagger; gated by `isPanelVisible()` so off-screen cards don't burn cycles
- Initial scroll: `data-initial-cat` attribute → JS scrolls instantly (scroll-behavior: auto) on first paint, then smooth for clicks

## Verified working

Run any of these from `site/`:
```
node scripts/probe-hub-fps.mjs   # 60fps, 0 long frames
node scripts/smoke.mjs           # ALL OK across /zh /en /yue + drawer i18n + hover lift
node scripts/a11y.mjs            # A11Y OK
node scripts/contrast.mjs        # all WCAG AA pass
node scripts/cross.mjs           # chromium + firefox + webkit all ✓
node scripts/perf.mjs            # FCP 1020ms LCP 1020ms CLS 0
```

## Known concerns / loose ends (read these)

1. **CategoryPivot.astro is now orphan code.** Removed import from browse and home. Component file still exists at `site/src/components/CategoryPivot.astro`. Safe to delete after verifying nothing else references it (`grep -r CategoryPivot site/src` should be empty).

2. **Old VT slide CSS is still in BaseLayout.astro.** Look for the `html.nav-next::view-transition-old(root)` rules around lines 808-845, plus the `@keyframes slide-out-left/right/in-left/in-right`, plus the `html.nav-next .cat-hero { view-transition-name: none !important }` suppression block, plus the `html.nav-next .wp-tile { animation: none !important }` entrance suppression. None of this is referenced now (hub bypasses VT for pivot). Safe to remove for ~80 lines of CSS reduction.

3. **`requestIdleCallback`-deferred motion init in BaseLayout setup()** — kept; still useful for non-hub pages (dish detail etc.).

4. **`tile-${cat.id}` view-transition-name was removed from `.cat-hero`** during stage 1. This means the morph from a homepage start-screen tile (which has `view-transition-name: tile-${cat.id}`) to the corresponding browse page no longer has a target — it just fades. Note: home navigation is now scroll-based (not a route change), so the morph doesn't apply anyway. But if you ever break the hub back into separate routes, this would matter.

5. **History pushState quirk**: pivot prev/next uses `replaceState` (not `pushState`) so the back button doesn't traverse the panel history. If you want each panel scroll to be a back-button stop, switch to `pushState` in `Hub.astro`'s `updatePivot()`. We chose replaceState because most users would find back-button-per-panel surprising.

6. **Featured Tile + Live Tile flip run on EVERY hub mount** now (was home-only before). Cost: one `setInterval(6000)` + ~12 staggered intervals. Off-screen panels are gated by `isPanelVisible()`. Cheap.

7. **Pagefind warning at `/`**: "1 page found without an <html> element" — pre-existing, unrelated to hub refactor. Ignore.

8. **Hub height = `calc(100vh - 120px)`** with `overflow-y: hidden` on hub, `overflow-y: auto` on each panel. On mobile Safari (dynamic viewport URL bar), this can fight scroll. Worth user-testing iOS. Could switch to `100dvh` if issues appear.

9. **The hub doesn't render below the viewport** — page footer (from BaseLayout) appears below the hub. Each panel scrolls vertically inside the hub area independently. Backwards-compat with existing footer layout maintained.

## How to extend / next moves the user might ask for

- **Add 10th panel (e.g., "About" or "Random Dish")**: edit `Hub.astro`, add a new `<section class="hub-panel" data-panel="about" data-name="..." data-url="...">` between home and first category. Update `panels.length` math automatically picks it up.

- **Real WP10 panorama parallax background**: the hub-pivot title currently doesn't move with scroll. Real WP panorama has the title translate slower than panel content. To add: bind a scroll listener on `.hub`, translate `.hub-pivot` by `scrollLeft * -0.4`. ~10 lines of JS.

- **Add "swipe peek" (next panel's left edge visible)**: change `.hub-panel { width: 100vw }` to `width: 92vw; margin-right: -8vw;` etc. Tricky to get right with scroll-snap-align.

- **Per-locale URL canonicalization**: home now has `replaceState('/zh/')` when scrolled to home. If user shares the URL `/zh/browse/rice` and scrolls to home, the URL becomes `/zh/` but the OG meta in the served HTML still says "rice". For perfect canonical URLs, would need to also rewrite OG tags via JS (not great for crawlers but matches user perception).

## Test harness (committed, reusable)

| Script | Purpose |
|---|---|
| `site/scripts/smoke.mjs` | 5-page visit + drawer i18n + hover lift |
| `site/scripts/contrast.mjs` | WCAG AA across themes/locales |
| `site/scripts/a11y.mjs` | Tab order, Escape, inert, alt, h1, reduced-motion |
| `site/scripts/perf.mjs` | FCP/LCP/CLS/transfer |
| `site/scripts/cross.mjs` | Chromium/Firefox/WebKit |
| `site/scripts/probe-vt-all.mjs` | Verify all VT categories still fire (pivot is N/A now — but tile→detail still works) |
| `site/scripts/probe-hub-fps.mjs` | **NEW**. Measures hub pivot scroll FPS. Target: 0 long frames |
| `site/scripts/probe-when.mjs`, `probe-vt.mjs`, `probe-swap.mjs`, `probe-anims.mjs`, `probe-fps.mjs`, `probe-live.mjs`, `probe-vt-name.mjs`, `probe-slide-timing.mjs`, `probe-video.mjs`, `probe-slide-visual.mjs` | Debugging history (kept for posterity). |

## Recent commit chain (relevant)

```
502ab7b stage 2: home + 8 browse pages share one 9-panel Hub component
ea6a3cf test: hub FPS probe + verify 60fps zero-jank baseline
29445f3 stage 1: browse pages now use Hub Pattern — zero DOM swap on pivot
a3b2752 perf: pivot slide — shorter duration + defer motion init past slide
5464c1d fix: suppress tile entrance stagger during pivot nav
406e360 fix: pivot nav slides EVERYTHING — suppress per-element VT names
946f6c5 fix: pivot slide — full-screen card travel, no opacity wash
09a5381 fix: defer nav-next/prev class removal until after VT finishes
25a96cd fix: pivot slide animation — propagate nav-next/prev to newDocument
c5e7a19 fix: touch swipe — reset transform BEFORE click so VT snapshots cleanly
```

## Earlier handoff context (still valid)

`docs/handoff/2026-05-25-wp10-refresh-done.md` covers the full WP10 Metro Refresh (Phase 1+2+3) before this hub work. The hub refactor *replaces* the pivot slide animation portion of that work (Phase 1 task M1/M5/F1 still active; the slide CSS is now dead code but not yet pruned — see concern #2).

## Final state at handoff

- 30+ commits on main since the refresh started
- All 5 test harnesses green against live deploy
- 60fps hub pivot verified
- 580 pages building cleanly in ~13s
- Bundle: JS 13.6KB / CSS 7KB / Fonts ~900KB (pruned)
- One open item: cleanup of dead VT slide CSS in BaseLayout.astro

That's the world. The next assistant should be able to pick up by reading this and the test harnesses.
