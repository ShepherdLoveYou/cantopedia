# Cantopedia · 粵食典 — Handoff (latest: 2026-05-24)

## Status snapshot

- **Live**: <https://shepherdloveyou.github.io/cantopedia>
- **Repo**: <https://github.com/ShepherdLoveYou/cantopedia> (public)
- **Release tag**: `v0.2.0` (planned after this push)
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

## WP10 polish — still TODO (Phase 3 — see prototype)

Priority order if you want me to continue:

1. **Live-tile flip animation** — on hover (desktop) or every 6 seconds (mobile), each homepage tile flips to show a secondary face (a featured dish from the category).
2. **WP10 "Resco-style" segmented arrows** in nav — back-arrow + forward-arrow as actual WP10-chrome glyphs.
3. **Tap ripple** — secondary press effect (subtle color wash from tap point).
4. **Marquee text** on tile names if they exceed width (very WP10).

The approved prototype at `docs/prototypes/2026-05-24-uwp-mock.html` is now the design contract for Phase 3+ work. See `docs/superpowers/specs/2026-05-24-uwp-phase3-design-stub.md` for the suggested phase decomposition.

## Other open work (v0.2+)

- **Dish images** — Wikimedia Commons search adapter is wired in `pipeline/pipeline/sources/wikimedia_commons.py`, but no images attached yet. Run `python -m pipeline fetch dish <slug>` to see candidates with licenses.
- **Pagefind UI page** — `/search` route doesn't exist yet; Pagefind is in dependencies but not initialised.
- **Community contribution flow** — CONTRIBUTING.md is a stub. Need PR/issue templates + license-screening checklist + CODE_OF_CONDUCT.md.
- **Ingredient stubs** — 110 of 116 ingredients have only name + category. Need nutrition (USDA) + procurement (海外采购) for the rest.

## Restart prompt for the new window

Copy this into your new session — it loads the right context fast:

```
# Cantopedia restart context

I'm continuing work on Cantopedia (粵食典), a tri-lingual open-source Cantonese
recipe project. Project root: d:/Cantonese Cuisine. Repo: 
https://github.com/ShepherdLoveYou/cantopedia.

Current state (read this first):
- See docs/HANDOFF.md for full state
- v0.1.0 shipped: 66/66 dishes complete, live at 
  https://shepherdloveyou.github.io/cantopedia
- Latest commit cce14fc started WP10 polish (ClientRouter, view transitions,
  tile press, loading bar)

Conventions to follow:
- Conda env: `conda activate cantopedia`
- Validate before commit: `cd pipeline && python -m pipeline validate`
- Build to verify: `cd site && pnpm build`
- YAML gotcha: `#` in unquoted strings is a comment; quote 
  any value containing `#` or starting with `"..."`. See HANDOFF.md
- Schema parity: site/src/content.config.ts (Zod) and 
  pipeline/pipeline/models.py (pydantic) must stay in sync
- Deploy workflow only triggers on changes to site/ or data/ — 
  docs/README/CHANGELOG changes don't redeploy

Next priorities (pick one or tell me which):
1. WP10 polish Phase 2 — dish-card→dish-hero shared element, 
   horizontal Hub navigation, live-tile flip
2. Dish images via Wikimedia Commons
3. Pagefind search UI page  
4. More ingredient enrichment

What should we work on?
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
