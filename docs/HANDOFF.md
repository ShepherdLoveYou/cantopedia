# Cantopedia · 粵食典 — Handoff (2026-05-25, clean state after experiment cleanup)

## Status snapshot

- **Live**: <https://shepherdloveyou.github.io/cantopedia> — deploys from `main` on push
- **Repo**: <https://github.com/ShepherdLoveYou/cantopedia> (public)
- **Last release tag**: `v0.4.0` — many shippable commits since but no new tag yet
- **Dishes**: 66/66 method_status: complete; **38/66 have CC photos** from Wikimedia Commons
- **CI/Deploy**: green; auto-runs on changes to `site/` or `data/`

## ⚠ Read this first — session lessons

The previous session shipped 50+ commits in rapid iteration and accumulated bug-fix-on-top-of-bug-fix churn. Two experimental dep additions were attempted then rolled back:

- **Vue 3 + `@astrojs/vue`** — installed, `NavDrawer.vue` written, never wired. Deps removed in cleanup.
- **MetroUI 4 CSS via CDN** — `<link>` added to `<head>`, no markup ever used Metro classes. Removed in cleanup.

The codebase is now back to pure Astro 5 + vanilla JS + `focus-trap` + `Pagefind` + `@astrojs/sitemap`. **Do not re-add Vue or MetroUI unless there's a specific feature that genuinely needs them** — the per-iteration cost was high and the user repeatedly pivoted.

**Engineering posture for the next session:**
- Before making UI changes, write a 2-3 sentence design note in the spec or commit message — what's the intent, what should happen
- Verify in a browser BEFORE committing for any visual/UX change (the user has been the QA layer; that's not scalable)
- Don't keep adding deps unless they earn their keep concretely
- Resist the urge to keep tweaking when user says "doesn't feel right" — ask **exactly what** isn't right before changing

## Stack as it stands (clean)

- Astro 5.16 static, pnpm, Node 22, 576 built pages
- View Transitions API via Astro `<ClientRouter />` — shared-element morphs work (tile/dish/sauce names), browser handles cross-fade
- focus-trap 8 (drawer a11y)
- Pagefind (built-in search index, runs as post-build step)
- @astrojs/sitemap (sitemap.xml + i18n)
- No Vue, no MetroUI, no other frameworks

## What's working as of this handoff

| Surface | State |
|---|---|
| Homepage Start Screen | 8 category tiles, WP10 size-variety, monoline SVG icons (CategoryIcon.astro), Live Tile flip on WIDE main (10s + 1.4s stagger) |
| Progress stats | 4 colored WP10 stat tiles (complete green / draft orange / stub steel / total red) + thin progress bar |
| Browse page | CategoryPivot strip (prev/current/next w/ 3:1 ratio + height-locked), colored cat-hero band, dish-cards with cat-color front + photo back flip, 5n+1 size rhythm |
| Dish detail page | Colored hero-band with optional Commons photo backdrop + credit, ingredient table, method steps, sauce link, history, sources |
| Top nav | 40px solid black status bar, "CANTOPEDIA" uppercase letter-spaced brand, hamburger left, locale pivot right (red underline on active via `::after`), isolated from root pivot via `view-transition-name: status-bar` |
| Drawer | Acrylic blur dark, focus-trap on open, 8 category links + search + locale + theme toggle |
| Footer | Full-bleed dark panel with red Metro stripe, uppercase letter-spaced text |
| Theme | data-theme on `<html>`, inline pre-paint script (data-astro-rerun), persists in localStorage, FOUC fix on `astro:before-swap` |
| Locale switch | Stays on same page (localeHref), refreshLocaleSwitchers re-applies .active on each page-load |
| Search | /[locale]/search route, Pagefind index, drawer search link, ?q= deep link |
| 404 | Custom WP10 Panorama, all 3 locale home links |
| Transitions | View Transitions API browser default cross-fade + slowed durations; per-tile/dish shared element morph |

## Known unfinished

- **NavDrawer.vue removed** but the vanilla drawer in BaseLayout works fine — no action needed
- **28 of 66 dishes have no photo** — specialty HK dishes Commons doesn't have (Portuguese-sauce baked rice, Chu Hou brisket, laksa variants, Béchamel chicken chop). Could try a 3rd pass with primary-noun queries OR upload our own to Commons.
- **110 of 116 ingredients are stubs** — nutrition, procurement not filled
- **v0.5.0 tag** not pushed — many shippable commits since v0.4.0

## Recent commits since v0.4.0 (highlights, latest first)

```
Cleanup: remove MetroUI CDN + NavDrawer.vue (this commit)
a93262b CategoryPivot — authentic WP10 Pivot proportions (3:1 current/peek)
84b670c Revert CategoryPivot to prev/current/next 3-item layout
534ca19 CategoryPivot — classic WP10 tab strip, all 8 categories at once (REVERTED)
9b82ad0 Mobile overflow — long category/dish names breaking out of viewport
1f96b74 WP Continuum tile-zoom morph — delegate fully to View Transitions API
0117952 HANDOFF — refresh for new-window handoff after v0.4.0 polish session
5441872 CategoryPivot — lock height, ellipsize long peek names
ee14756 Damped transitions — bigger pivot + opacity-only fade-in cascade
eb4c16b Top nav resize jiggle on mobile — isolate from root pivot
20e8e32 Smoother page nav — drop competing cascade, soften pivot
e337e16 Progress stats as WP10 tiles — 4 colored Live Tiles
99aa9a6 WP10 footer — full-bleed dark bar matching status bar at top
9be771f WP10 status bar — slim solid top nav, uppercase CANTOPEDIA mark
d746481 WP10 typography weight bump — 200/300 -> 300/400
0309be0 Dish-card live tile flip — solid front, photo back, staggered
b40d889 Bug sweep — 404 locale, hardcoded base, alt text, tile flip lifecycle
b050e5e Locale switcher bugs — wrong href + active indicator stuck
7423d30 Dark mode bug — white flash on every page navigation
e57c778 Phase 5A — lenient image pass: 38/66 dishes now have photos
62ec0ee Fix dish image 404s — Commons rejects arbitrary thumb widths
f87f13d Phase 5 (B+C) — Pagefind search + SEO basics + 404 page
```

## Restart prompt for new window

```
# Cantopedia restart context (2026-05-25, post-experiment cleanup)

Project root: d:/Cantonese Cuisine.
Repo: https://github.com/ShepherdLoveYou/cantopedia
Live: https://shepherdloveyou.github.io/cantopedia

Read docs/HANDOFF.md FIRST — it has full state + lessons from the
previous session's iteration thrash.

CRITICAL POSTURE NOTES (from the lessons):
- The user iterates aggressively on UI feedback — resist the urge to
  ship per-comment tweaks. Ask EXACTLY what's wrong before changing.
- Do NOT re-add Vue, MetroUI, or other frameworks. They were tried
  and rolled back. The current vanilla stack works.
- Verify in a browser BEFORE committing UI changes. The user has
  been the visual QA; that's not sustainable.

Stack:
- Astro 5.16 static, pnpm, Node 22
- focus-trap (drawer a11y), Pagefind (search), @astrojs/sitemap
- View Transitions API via <ClientRouter />, shared-element morphs

Conventions:
- Dev: cd site && pnpm dev → http://localhost:4321/cantopedia/
- Build: pnpm build (runs astro build + pagefind index)
- Validate data: cd pipeline && python -m pipeline validate
- Pipeline image attach: PYTHONIOENCODING=utf-8 python -X utf8 -m
  pipeline fetch attach-images [--lenient]
- Schema parity: site/src/content.config.ts (Zod) ↔
  pipeline/pipeline/models.py (pydantic). Keep them in sync.

User patterns:
- High autonomy, will accept recommendations but switches direction
  fast if a result looks worse than the prior state
- "Don't reinvent the wheel" — but ONLY use existing libs that earn
  their keep. Don't load a CDN framework just to have it.
- Recurring "doesn't feel WP10" feedback — be aggressive with Metro
  styling but commit to a direction once decided

Suggested next tasks (in order of value):
1. Tag v0.5.0 — many shippable commits accumulated since v0.4.0
2. Try a 3rd image-attach pass on the 28 unimaged dishes using
   primary-noun-only queries
3. Begin ingredient nutrition enrichment (USDA adapter exists)
4. Add an /about page (or section) explaining the project + license
```

## Repo at a glance

```
cantopedia/
├── data/                         ★ source of truth — 66 dishes, 116 ingredients, 8 categories, 1 sauce
├── pipeline/                     Python CLI
│   └── pipeline/commands/fetch.py    ← attach-images --lenient lives here
├── site/                         Astro 5 (pnpm, Node 22)
│   ├── src/lib/
│   │   ├── categoryColors.ts     unified Metro WP10 palette
│   │   ├── categoryOrder.ts      pivot prev/next math
│   │   └── commonsImage.ts       Commons thumb URL via Special:FilePath
│   ├── src/components/
│   │   ├── CategoryPivot.astro
│   │   └── CategoryIcon.astro
│   └── src/pages/                index, browse, dishes, ingredients, sauces, search, 404
├── docs/
│   ├── superpowers/specs/        design docs (Phase 2-4)
│   └── HANDOFF.md                ← this file
└── .github/workflows/            deploy.yml + ci.yml
```

— Claude
