# Cantopedia · 粵食典 — Handoff (2026-05-24)

## What's live

- **Live site**: <https://shepherdloveyou.github.io/cantopedia>
- **Repo**: <https://github.com/ShepherdLoveYou/cantopedia> (public)
- **Status**: v0.1.0 tagged. CI + Deploy workflows green.
- **Dishes**: **66/66 method_status: complete**, all with tri-lingual (粵/中/English)
  method, history, tips, allergens, difficulty, prep+cook time, equipment.

## What got built (one session, ~13 hours of autonomous work)

1. **M1** — Repo skeleton: dual licenses (MIT + CC BY-SA 4.0), tri-lingual READMEs,
   six original menu photos archived
2. **M2** — Astro 5 site with Content Collections + Zod schemas; tri-lingual
   i18n routing (`/zh/`, `/en/`, `/yue/`)
3. **M3** — Python pipeline (`conda env cantopedia`) with pydantic models
   mirroring Zod, Click CLI, Wikipedia + Wikimedia Commons adapters, on-disk cache
4. **M4** — `pipeline init` generated 66 stub dishes + 110 ingredient stubs
   from hand-transcription of the menu
5. **M5** — Metro / Windows-Phone-style UX with W3CSS palette, Segoe font stack,
   sticky pivot nav, Live Tile homepage, dish hero band with breadcrumbs
6. **M8** — GitHub Pages deploy via `withastro/action@v3` (Node 22, pnpm@10)
7. **M9** — CHANGELOG, READMEs, this handoff, v0.1.0 tag
8. **13 enrichment iterations** — promoted all 66 dishes from `stub` to `complete`
   with hand-authored tri-lingual content. No Claude API was used; everything
   is original Cantonese-cuisine prose written by me with Wikipedia/CC source
   references.

## Repo at-a-glance

```
cantopedia/
├── data/              ★ source of truth — 8 categories, 66 dishes,
│                        116 ingredients, 1 sauce, 7 sources
├── pipeline/          Python package (conda env: cantopedia)
├── site/              Astro 5 (pnpm, Node 22)
├── raw_materials/     6 original menu photos (HEIC + JPEG previews)
├── docs/
│   ├── superpowers/specs/2026-05-24-...-design.md   ← full design spec
│   └── HANDOFF.md                                   ← this file
├── .github/workflows/ deploy.yml + ci.yml
├── README.md / README.zh.md
├── CHANGELOG.md
├── LICENSE-CODE       MIT
├── LICENSE-CONTENT    CC BY-SA 4.0
├── .env.example       PEXELS/UNSPLASH/USDA/ANTHROPIC keys
└── .env               (gitignored; your local Pexels key)
```

## How to re-open the project later

```bash
cd "d:/Cantonese Cuisine"

# Activate conda env
conda activate cantopedia

# Check pipeline status
cd pipeline && python -m pipeline status

# Make a data change, then validate
python -m pipeline validate

# Run the site locally
cd ../site && pnpm install && pnpm dev
# → http://localhost:4321/cantopedia/

# Build (CI does this on push)
pnpm build

# Or just git push and let CI deploy
git push
```

## Things you should know

### Conda env name was renamed
- The env is now `cantopedia` (was `cantonese-cuisine`). All scripts reference the new name.

### API key handling
- **Pexels API key** you gave is stored:
  - Locally in `.env` (gitignored)
  - As GitHub Actions secret `PEXELS_API_KEY` on the repo
- Other keys (`UNSPLASH`, `USDA`, `ANTHROPIC`) are documented in `.env.example` but
  not set — fill them in if/when you want to enable those features.
- **No Anthropic API calls were made**. The synthesize layer is intentionally
  not implemented; all enrichment was hand-authored.

### YAML gotchas I hit (and fixed) — for your future editing
- **`#` in unquoted strings** triggers a YAML comment. Always quote strings
  containing `#`. Example: `note: "Item #16 on the source menu"`.
- **English `en:` values starting with `"..."`** confuse YAML — it tries to
  parse the whole value as a quoted string. Use single quotes around the whole
  value: `en: '"金包銀" — gold wrapping silver'`.
- **`word: word` colons** in unquoted strings break YAML. Either use em-dashes
  instead, or wrap the value in quotes.

### Schema notes
- The `prep` field on ingredient refs is `TriLangBodyPartial` (yue / zh / en, all
  optional) — distinct from the `names` field which uses `TriLangText`
  (yue_hant / jyutping / zh / en, all required). Don't confuse them.
- `allergens` enum: gluten, peanut, tree_nut, shellfish, fish, dairy, egg, soy,
  sesame, sulfite.
- `equipment` enum: wok, rice_cooker, steamer, oven, pressure_cooker,
  chinese_cleaver, blender, smoker, sous_vide.
- `method_status` enum: stub / draft / complete. All 66 are currently `complete`.

### Design system
- Authentic W3CSS Metro palette (per category):
  appetizer #e51400 · soup-wonton #2d89ef · rice #f09609 · noodle #008a00 ·
  soup-noodle #00aba9 · baked-rice #a05000 · congee #9f00a7 · main #1d1d1d
- Sans-serif primary: Segoe UI / Noto Sans SC; serif for body / dish display:
  Crimson Pro / Noto Serif SC.
- 朱紅 印章 logo on top-left, no dark mode, no gradients.

### What's NOT done (planned for v0.2 / v0.3)

- **No images on dishes** — Wikimedia Commons image search is implemented
  but no images are attached. To add: `python -m pipeline fetch dish <id>`
  lists candidates with licenses; you'd then download, optimise via Astro's
  image pipeline, and add `images:` entries to dish YAMLs.
- **No community-contribution flow** — CONTRIBUTING is a stub. v0.2 should
  add issue/PR templates, license screening, image submission, CoC.
- **Some ingredient procurement / nutrition fields are sparse** — only the
  6 original ingredients (cha-siu, gai-laan, jasmine-rice, honey, hoisin,
  maltose) have full nutrition + procurement detail. The 110 stub ingredients
  have name + category only.
- **No Pagefind UI yet** — Pagefind is configured but the `/search` page
  hasn't been built. Easy add when needed.

## Commits & branches

- Single branch: `main`. Linear history (no feature branches were needed for
  this solo session).
- 25-ish commits, each tagged with milestone (M1, M2, M3, M4, M5a, M5b, M8,
  iter 1-13, etc.). Read `git log --oneline` to retrace.

## If something is wrong

The most likely "something wrong" is data quality — a translation that sounds
off, a method step that's vague, a tip that's not quite right. To fix:

1. Find the dish YAML in `data/dishes/`
2. Edit the field
3. Run `python -m pipeline validate` to check schema
4. Commit + push → CI builds and deploys

For schema changes, edit `site/src/content.config.ts` AND
`pipeline/pipeline/models.py` together (they must stay in parity).

For pipeline changes, the code is small and well-commented; start at
`pipeline/pipeline/cli.py` and follow the imports.

For site UX changes, start at `site/src/layouts/BaseLayout.astro` for chrome
and `site/src/pages/` for routes.

## Cost so far

- Cloud: zero. GitHub Pages is free at this scale.
- API: zero. Pexels key stored but not yet used. No Anthropic API calls.
- Your time: ~9 hours sleep, 0 minutes of work during. My time:
  ~13 hours of autonomous building.

## Next moves (when you wake)

1. **Visit the live site**: <https://shepherdloveyou.github.io/cantopedia>
2. **Click around** — at least 5 dishes across different categories. The
   layout should feel Metro-clean and the content tri-lingual.
3. **Spot-check the writing** — find one dish you know well and read all
   three language versions. Tell me what's off.
4. **Decide on v0.2 direction** — images? community-contribution flow? more
   dishes beyond the menu?

Good morning!

— Claude
