# Cantopedia · 粵食典 — Handoff (latest: 2026-05-24, end of v0.4.0 session)

## Status snapshot

- **Live**: <https://shepherdloveyou.github.io/cantopedia> — v0.4.0 (Phase 4: hamburger drawer + acrylic blur + dark mode + Continuum cascade)
- **Repo**: <https://github.com/ShepherdLoveYou/cantopedia> (public)
- **Release tag**: `v0.4.0` (planned after this push)
- **New dep:** `focus-trap@8.2.1` (MIT, 4 KB) for drawer a11y. All other Phase 4 features hand-rolled.
- **Dishes**: 66/66 method_status: complete, full tri-lingual (粵/中/En)
- **CI/Deploy**: green; deploy workflow auto-runs on changes to `site/` or `data/`

## What was done in the last session

### v0.1.0 — ship (earlier today)
1. Repo skeleton (dual-license, READMEs, menu photos archived)
2. Astro 5 site with Content Collections + Zod schemas, tri-lingual i18n routing
3. Python pipeline (conda env `cantopedia`): models, CLI, Wikipedia/Wikimedia adapters
4. `pipeline init` → 66 stub dishes + 110 ingredient stubs from menu transcription
5. Metro UX with W3CSS palette, sticky pivot nav, Live Tile homepage
6. 13 enrichment iterations: all 66 dishes hand-authored to `complete`
7. Deploy to GitHub Pages, v0.1.0 tagged

### WP10 polish v1 (latest commit: `cce14fc`)
User feedback: "整个网站和互交，UI 还不是全是 wp10 风格 — 点击新磁块，不要跳转新网页，而是在本网页跳转，类似 wp10 跳转风格"

Implemented:
- **Astro 5 ClientRouter**: smooth in-place navigation (URL still changes, no full reload)
- **Top loading bar**: WP10-style sliding red strip during transitions
- **Shared element transitions**: tile color expands into category hero (`view-transition-name="tile-<category>"`)
- **WP10 tile press**: `.wp-tile:active` does a bouncy 0.96 squish-and-spring
- **Tighter typography**: h1/h2 weight 200, more letter-spacing contrast
- Persistent nav and loading bar across transitions

### WP10 polish v2 — Phase 2 SHIPPED

Implemented per spec `docs/superpowers/specs/2026-05-24-wp10-phase2-design.md`:

- **3-peek pivot strip** on `/browse/<category>` pages — current category large, ±1 dim peek neighbors. Click peek, keyboard `←/→`, or touch swipe navigates between categories.
- **dish-card → hero-band shared element morph** — clicking a dish card on the browse page morphs the whole card into the colored hero band on the dish detail page. Each card now has a 6px catColor top stripe as the morph anchor.
- **Fluent motion tokens** borrowed (MIT, microsoft/fluentui): `--fluent-curve-{decelerate-mid,accelerate-mid,easy-ease}`, `--fluent-duration-{fast,normal,gentle}`.
- **Directional slide animation** for pivot navigation (exit accelerates, enter decelerates).
- **prefers-reduced-motion** guard disables all view-transition animations.

Files added: `site/src/lib/categoryOrder.ts` + `.test.ts`, `site/src/components/CategoryPivot.astro`. Files modified: `BaseLayout.astro`, `pages/[locale]/browse/[category].astro`, `pages/[locale]/dishes/[id].astro`.

### UWP polish v3 — Phase 3 (A+B+E) SHIPPED

Implemented per spec `docs/superpowers/specs/2026-05-24-uwp-phase3-abe-design.md`:

- **Start Screen homepage** — 4-column explicit grid: 1 WIDE main (22), 3 MEDIUM rice/noodle/appetizer (7-11), 4 SMALL soup-wonton/soup-noodle/baked-rice/congee (3-5). Size mapping by dish count (≥20/7-19/<7).
- **3D directional tilt press** — `.wp-tile` upgraded site-wide. Press point computed in JS (max 3° rotation + scale 0.96 via `--tilt-x` / `--tilt-y`). Replaces v1's scale-only press.
- **Monoline SVG icons** — 8 hand-drawn category glyphs in `CategoryIcon.astro` (1.4 stroke, 32×32 viewBox) replace emoji.
- **Live Tile flip** — WIDE main tile flips X-axis every 8s; back face shows dictionary stats (`66` + `粵食典 · 數據` tagline). Pauses on `document.hidden` or `.pressing`.

Files added: `site/src/components/CategoryIcon.astro`. Files modified: `BaseLayout.astro` (tilt CSS + script), `pages/[locale]/index.astro` (Start Screen layout + Live Tile flip).

Build clean: 576 pages, vitest 5/5, `astro check` 0 errors.

### UWP polish v4 — Phase 4 SHIPPED

Spec: `docs/superpowers/specs/2026-05-24-uwp-phase4-design.md`.

- **Hamburger drawer + acrylic blur nav** — left-slide drawer with the 8 categories (icons + counts), locale picker, theme toggle. Nav and drawer both use `backdrop-filter: blur(20-24px) saturate(180%)` with solid-rgba fallback. Hamburger animates into an ✕.
- **Dark / Light / Auto theme** — `<html data-theme>` driven CSS custom properties. Inline pre-paint script avoids FOUC. Choice persisted in `localStorage`. "Auto" follows `prefers-color-scheme`.
- **Continuum domino transitions** — every `<main>` child gets a 50ms-stagger `translateY(18px)+opacity` cascade on page load/navigation. Pure CSS, no JS.
- **Drawer a11y** — uses `focus-trap` (MIT, 4 KB). Closes on Esc, scrim click, link click, and `astro:before-preparation`.
- **Theme migration** — `body`, `.metro-nav`, all literal `white`/`#fff` backgrounds on `.progress-section`, `.aside-card`, `.ing-table`, `.sauce-card`, `.tips`, `.history` switched to `var(--t-card)`. Other surfaces inherit via alias.

Files modified: `BaseLayout.astro`, `pages/[locale]/index.astro`, `pages/[locale]/dishes/[id].astro`. New dep: `focus-trap`.

Build clean: 576 pages, vitest 5/5, `astro check` 0 errors.

## Phase 3 (A+B+E) — SHIPPED (kept for archival; see section above)

**User feedback at end of v0.2.0 session:** "不够彻底，还不彻底是 windows10 mobile 的 UI" — Phase 2 alone (pivot strip + dish-card morph + Fluent tokens) doesn't deliver the full WP10 Mobile experience. The approved design contract is the standalone prototype at `docs/prototypes/2026-05-24-uwp-mock.html` (commit `b9a8b3c`).

**Phase 3 scope (chosen by user as `A + B + E`):**

- **A. Start Screen homepage** — replace uniform tile-grid with explicit 4×6 grid: 1 WIDE main, 3 MEDIUM (rice/noodle/appetizer), 4 SMALL (soup-wonton/soup-noodle/baked-rice/congee). Size mapping by dish count (≥20/7-19/<7).
- **B. 3D directional tilt press + monoline SVG icons** — upgrade `.wp-tile:active` from scale-only to perspective + rotateX/Y toward press point (max 3° + scale 0.96). Replace 8 emoji glyphs with hand-drawn 32×32 SVG icons via new `CategoryIcon.astro` component.
- **E. Live Tile flip on WIDE main** — X-axis flip every 8s. Front = icon + name + count. Back = dictionary stats (no daily recommendations, no photos — those need image pipeline).

**Spec:** `docs/superpowers/specs/2026-05-24-uwp-phase3-abe-design.md`
**Plan:** `docs/superpowers/plans/2026-05-24-uwp-phase3-abe-plan.md` (5 tasks, each commit-able)

## Phase 4+ — still TODO (see prototype contract for design)

Larger UWP overhaul items deferred from Phase 3:

1. **Hamburger drawer + acrylic blur** — additive to pivot strip (both coexist as in WP10).
2. **Dark / Light dual mode + accent picker + bottom AppBar** — theming refactor; touches all CSS color literals.
3. **Wide-tile photo flip back** — requires dish images pipeline to be unblocked first.
4. **A-Z jumping grid search** — depends on Pagefind init.
5. **Continuum dominos page transitions** — alternate to current ClientRouter cross-fade.
6. **WP10 "Resco-style" segmented arrows**, tap ripple, marquee — minor polish.

The prototype is the design contract for items 1-5. See `docs/superpowers/specs/2026-05-24-uwp-phase3-design-stub.md` for the suggested Phase 4-7 decomposition.

## Other open work (v0.2+)

- **Dish images** — Wikimedia Commons search adapter is wired in `pipeline/pipeline/sources/wikimedia_commons.py`, but no images attached yet. Run `python -m pipeline fetch dish <slug>` to see candidates with licenses.
- **Pagefind UI page** — `/search` route doesn't exist yet; Pagefind is in dependencies but not initialised.
- **Community contribution flow** — CONTRIBUTING.md is a stub. Need PR/issue templates + license-screening checklist + CODE_OF_CONDUCT.md.
- **Ingredient stubs** — 110 of 116 ingredients have only name + category. Need nutrition (USDA) + procurement (海外采购) for the rest.

## Restart prompt for the new window — Phase 3 (A+B+E) execution

Copy this into your new session. It loads the right context fast and points the agent straight to the ready plan:

```
# Cantopedia restart context (2026-05-24, after v0.2.0)

I'm continuing work on Cantopedia (粵食典). Project root: d:/Cantonese Cuisine.
Repo: https://github.com/ShepherdLoveYou/cantopedia.

Current state:
- v0.2.0 LIVE at https://shepherdloveyou.github.io/cantopedia
- Latest commit on main: 175935a (Phase 2 final review fixes)
- See docs/HANDOFF.md for full state

User feedback at end of last session: "不够彻底，还不彻底是 windows10 mobile 的 UI".
Phase 2 (pivot + morph + tokens) shipped but the homepage and tiles still
don't read as WP10 Mobile.

The approved design contract is the standalone prototype:
  docs/prototypes/2026-05-24-uwp-mock.html (commit b9a8b3c)

Next task: execute Phase 3 (A + B + E) — Start Screen homepage + 3D tilt
press + monoline SVG icons + Live Tile flip. NOT yet implemented in Astro.

Spec: docs/superpowers/specs/2026-05-24-uwp-phase3-abe-design.md
Plan: docs/superpowers/plans/2026-05-24-uwp-phase3-abe-plan.md
       (5 tasks, each commit-able)

Phase 4+ (hamburger drawer + acrylic, dark/light + accent picker + AppBar,
photo flip, A-Z search) is documented separately in 
docs/superpowers/specs/2026-05-24-uwp-phase3-design-stub.md — NOT in scope
for this session. Stay focused on A+B+E only.

Conventions:
- Conda env: conda activate cantopedia
- Site dev: cd site && pnpm dev → http://localhost:4321/cantopedia/
- Validate: cd pipeline && python -m pipeline validate (only if data/ touched;
  not needed for Phase 3)
- Schema parity: site/src/content.config.ts (Zod) and
  pipeline/pipeline/models.py (pydantic) must stay in sync
- Deploy auto-triggers on push if site/ or data/ changed (docs/README don't)
- YAML gotcha: # is a comment in unquoted strings; en: "..." values need to
  be single-quote-wrapped

Suggested execution: use superpowers:subagent-driven-development to dispatch
fresh subagents per task, with spec compliance + code quality reviews
between tasks. Same flow as v0.2.0.

DO NOT push to remote until all 5 tasks complete + final review clean +
visual smoke approved.

Start with: read the Phase 3 plan, then dispatch Task 1 (CategoryIcon
component).
```

## Quick local dev commands

```bash
# Activate env
conda activate cantopedia

# Validate data
cd "d:/Cantonese Cuisine/pipeline"
python -m pipeline validate
python -m pipeline status

# Run site
cd "d:/Cantonese Cuisine/site"
pnpm install
pnpm dev    # → http://localhost:4321/cantopedia/

# Build (CI does this on push)
pnpm build
```

## Repo at a glance

```
cantopedia/
├── data/              ★ source of truth — 66 dishes, 116 ingredients, 8 categories, 1 sauce, 7 sources
├── pipeline/          Python (conda env: cantopedia)
├── site/              Astro 5 (pnpm, Node 22) — built sites are 576 pages
├── raw_materials/     6 menu photos (HEIC + JPEG previews)
├── docs/
│   ├── superpowers/specs/2026-05-24-...-design.md   ← full design spec
│   └── HANDOFF.md                                   ← this file (always update on session end)
├── .github/workflows/ deploy.yml + ci.yml
├── README.md / README.zh.md
├── CHANGELOG.md
├── LICENSE-CODE       MIT
├── LICENSE-CONTENT    CC BY-SA 4.0
├── .env.example       PEXELS/UNSPLASH/USDA/ANTHROPIC keys
└── .env               (gitignored; your local Pexels key)
```

## API key locations

- **PEXELS_API_KEY**: set in `.env` (gitignored) AND as GitHub Actions secret
- **UNSPLASH_ACCESS_KEY**, **USDA_API_KEY**, **ANTHROPIC_API_KEY**: documented in `.env.example`, not set. Fill in when you want those features.

— Claude
