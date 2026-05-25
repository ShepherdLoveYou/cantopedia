# Cantopedia · 粵食典 — Handoff (latest: 2026-05-25)

## Status snapshot

- **Live**: <https://shepherdloveyou.github.io/cantopedia> — latest deploy from commit `5441872`
- **Repo**: <https://github.com/ShepherdLoveYou/cantopedia> (public)
- **Last release tag**: `v0.4.0` (Phase 4 — drawer + dark mode). v0.5.0 not tagged yet despite Phase 5 + many polish commits.
- **Dishes**: 66/66 method_status: complete; **38/66 now have CC-licensed photos from Wikimedia Commons**
- **CI/Deploy**: green; deploy workflow auto-runs on changes to `site/` or `data/`

## What shipped since v0.4.0 (not yet tagged)

Roughly in order of commit, latest first:

1. **CategoryPivot fix (`5441872`)** — peek names were wrapping to 3-4 lines, pivot strip resized per category, caused visible jump on left/right swipe. Locked min-height, ellipsized peek text, single-line current title with `clamp(1.75..2.5rem)`.
2. **Damped transitions (`ee14756`)** — root horizontal pivot 12% → **22% translate** over 340/500ms damped curves. Added opacity-only fade-in cascade on `main > *` (520ms, 70ms stagger). Gated via `<html data-cascade>` so it plays AFTER VT settles.
3. **Top nav isolation (`eb4c16b`)** — gave `.metro-nav`, `.loading-bar`, `footer` their own `view-transition-name` so they're independent of the root pivot. Fixes "top bar resizes during mobile swipe."
4. **Progress stats → tiles (`e337e16`)** — homepage "CATALOGING PROGRESS" inline counts replaced by 4 colored Live Tiles (complete green / draft orange / stub steel / total red).
5. **WP10 footer (`99aa9a6`)** — full-bleed `#000` panel with red Metro stripe accent, uppercase letter-spaced text. Symmetric with the top status bar.
6. **WP10 status bar (`9be771f`)** — top nav slimmed to 40px solid `#000`, "CANTOPEDIA" uppercase letter-spaced, red `::after` underline on active locale pivot, no acrylic blur.
7. **Typography weight bump (`d746481`)** — site-wide 200→300 / 300→400. WP10 uses Segoe UI Semilight (300) for heads, not Light (200).
8. **Vue 3 + MetroUI 4 experiment (`d905daa`)** — `@astrojs/vue@5` + `vue@3.5` installed. `NavDrawer.vue` built **but NOT wired** (BaseLayout still uses vanilla drawer). MetroUI 4.5.12 CSS loaded via CDN in `<head>` before our styles. Bundle +~240KB CSS.
9. **Dish-card live tile flip (`0309be0`)** — every dish-card on browse with a photo flips like the homepage WIDE tile. Front = solid cat-color + white text. Back = full-bleed photo, no tint. Same 10s/1.4s-stagger cycle.
10. **Bug sweep (`b40d889`)** — 404 page locale (was hardcoded `/zh/`), refreshLocaleSwitchers hardcoded `/cantopedia`, missing alt text, Live Tile flip lifecycle.
11. **Locale switcher bugs (`b050e5e`)** — links went to locale home not equivalent page; red active bar didn't move (nav has `transition:persist`).
12. **Dark mode FOUC (`7423d30`)** — white flash on every page nav. Fix: stamp `data-theme` onto `e.newDocument` in `astro:before-swap`.
13. **Phase 5A (`e57c778`)** — `pipeline fetch attach-images --lenient` adds Chinese-name fallback + drops keyword filter. **38 of 66 dishes** have photos.
14. **Commons thumb fix (`62ec0ee`)** — `/thumb/W/file.jpg/600px-file.jpg` URLs were 400s. Switched to `Special:FilePath/<file>?width=N` which 302-redirects to the nearest allowed thumb.
15. **Pagefind search + SEO + 404 (`f87f13d`)** — `/[locale]/search` route, drawer search link, `@astrojs/sitemap`, OG/Twitter meta, custom 404, `og-default.svg`.

## Stack as it stands

- **Astro 5.16** static, `pnpm`, Node 22
- **`@astrojs/vue@5` + `vue@3.5`** — installed for experimentation, ONE component built (`src/components/NavDrawer.vue`) but not wired. BaseLayout still uses the vanilla Astro drawer.
- **MetroUI 4.5.12** loaded via CDN `<link>` in BaseLayout `<head>` — CSS only, no JS. We let our `:root` vars and selectors override Metro's defaults. Not actively using Metro classes yet; loaded so authors can use `.tile`, `.pivot`, etc.
- **focus-trap 8** for drawer a11y, **Pagefind** for search, **@astrojs/sitemap** for sitemap.
- **No Vue 2, no Fluent UI** (proposed but rejected — Vue 2 EOL, Fluent UI is Win11 not WP10).

## Open threads / known unfinished

- **NavDrawer.vue** exists but is NOT mounted in BaseLayout. BaseLayout still renders the vanilla drawer + scripts. If the next session wants to ship the Vue migration, swap the drawer markup in BaseLayout for `<NavDrawer client:load transition:persist locale={locale} ... />` and remove the duplicate drawer/script blocks.
- **MetroUI integration** is half-done — CSS is loaded but no markup uses `.tile`, `.panorama`, `.navview` classes yet. Either commit to porting our hand-styled components onto Metro classes OR remove the CDN `<link>`. Currently it's loaded for the styles to be available but inert.
- **28 of 66 dishes still have no photo** — specialty HK dishes (Portuguese-sauce baked rice, Chu Hou brisket, laksa variants, etc.) Commons doesn't have. Could try `pipeline fetch attach-images --lenient --no-cache` again with a third pass that uses primary-noun-only queries, or manually upload our own to Commons.
- **110 of 116 ingredients are still stubs** — nutrition (USDA), procurement (海外采购) not filled.
- **v0.5.0 tag** not yet pushed despite many shippable commits since v0.4.0.

## Likely next user feedback (recurring patterns this session)

- "feels too thin / too light" → weights have been bumped to 300/400 floor; if user still complains push to 400/500
- "doesn't feel WP10" → MetroUI 4 CSS now loaded; can actually port markup to Metro classes for stronger authenticity
- "transitions feel jumpy/abrupt" → just fixed by isolating nav/footer + opacity-only fade cascade gated behind VT. If issue persists, look at the `setupNavDirection` IIFE and the `data-cascade` gate.
- "dark mode bug" → most known cases fixed (FOUC, locale-stuck active class, `main` color invisible). New ones likely come from individual page CSS that hasn't been audited.

## Restart prompt for the new window

Copy this verbatim into the next session:

```
# Cantopedia restart context (2026-05-25)

I'm continuing work on Cantopedia (粵食典). Project root: d:/Cantonese Cuisine.
Repo: https://github.com/ShepherdLoveYou/cantopedia.
Live: https://shepherdloveyou.github.io/cantopedia

Read docs/HANDOFF.md first — it has the full state since v0.4.0 (many
polish commits, no new tag yet). Latest commit on main: 5441872.

What's live now:
- 66 dishes complete, 38 with Wikimedia Commons photos (28 still without)
- WP10 Mobile styling: 40px solid black status bar at top, full-bleed
  dark footer, drawer w/ acrylic blur, dark mode, horizontal-pivot
  page transitions with opacity fade-in cascade
- Pagefind search at /<locale>/search, sitemap.xml, OG meta, 404 page
- Vue 3 + MetroUI 4 CSS both INSTALLED but mostly inert — see
  HANDOFF.md "Open threads"

Conventions:
- Site dev: cd site && pnpm dev → http://localhost:4321/cantopedia/
- Build: pnpm build (runs astro build + pagefind index)
- Validate data: cd pipeline && python -m pipeline validate
- Pipeline image attach: PYTHONIOENCODING=utf-8 python -X utf8 -m
  pipeline fetch attach-images [--lenient]
- Schema parity: site/src/content.config.ts (Zod) and
  pipeline/pipeline/models.py (pydantic) must stay in sync
- Auto-deploys on push if site/ or data/ changed

User patterns to know (from memory):
- High autonomy: defers tech decisions to recommendations
- "Don't reinvent the wheel" — use existing GitHub libs (focus-trap,
  Pagefind, MetroUI, etc.) over hand-rolled when feasible
- Recurring feedback: "doesn't feel WP10 enough" — be aggressive with
  Metro-styling, don't under-shoot
- Will revert if a change looks worse than what came before — don't
  fear shipping bold changes, but always keep the prior commit hash
  in the commit message for easy revert

Suggested first task: either
(a) Decide whether to actually wire NavDrawer.vue into BaseLayout, OR
(b) Port homepage tile markup onto MetroUI's data-role="tile" classes
to actually exercise the Metro UI CSS we already loaded.

DO NOT keep both Vue + MetroUI loaded but unused — pick one direction
and either commit to it or remove the dep.
```

## Repo at a glance

```
cantopedia/
├── data/                         ★ source of truth — 66 dishes, 116 ingredients, 8 categories, 1 sauce
├── pipeline/                     Python CLI (conda env: cantopedia)
│   └── pipeline/commands/fetch.py    ← attach-images CLI lives here
├── site/                         Astro 5 (pnpm, Node 22) — ~580 built pages
│   ├── src/lib/
│   │   ├── categoryColors.ts     unified Metro WP10 palette
│   │   ├── categoryOrder.ts      pivot prev/next math
│   │   └── commonsImage.ts       Commons thumb URL builder (Special:FilePath)
│   ├── src/components/
│   │   ├── NavDrawer.vue         ★ Vue 3 SFC — built but NOT yet wired
│   │   ├── CategoryPivot.astro
│   │   └── CategoryIcon.astro
│   └── src/pages/                index, browse, dishes, ingredients, sauces, search, 404
├── docs/
│   ├── superpowers/specs/        design docs (Phase 2, 3, 4 design specs)
│   └── HANDOFF.md                ← this file
├── .github/workflows/            deploy.yml + ci.yml
└── README.md / CHANGELOG.md / LICENSE-CODE (MIT) / LICENSE-CONTENT (CC BY-SA 4.0)
```

— Claude
