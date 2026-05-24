# Changelog

All notable changes to Cantopedia will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-24

The "everything actually works" first release. **All 66 dishes complete** with
full tri-lingual (粵 / 中 / English) method, history, tips, allergens,
difficulty rating, prep + cook timing, and equipment list.

Live at: <https://shepherdloveyou.github.io/cantopedia>

### Added

#### Repository foundation
- Dual-license arrangement — MIT for code, CC BY-SA 4.0 for content
- Tri-lingual READMEs (English + Chinese), CONTRIBUTING stub
- Six original 港式茶餐廳 menu photographs (`raw_materials/menu_photos/`, CC BY-SA 4.0)
- Design spec at `docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md`

#### Data layer (`data/`)
- 8 categories: 頭盤, 湯/雲吞, 炒飯, 炒麵, 湯米線, 焗飯, 粥品, 主菜 — each with tri-lingual descriptions
- 116 ingredients with tri-lingual names, categories, and (for the demo set)
  nutrition and procurement notes
- 1 sauce (蜜汁 honey glaze) with full method
- 66 dishes, **all method_status: complete**, each containing:
  - Tri-lingual names (粵語本字 + 粵拼 jyutping + 普通話 + English)
  - Cross-referenced ingredient list with portions and prep notes
  - 3-7 method steps with tri-lingual prose, temperature, timing, citations
  - Tips section with 2-4 tri-lingual entries
  - History section with tri-lingual context (origin, etymology, cultural notes)
  - Allergens, difficulty, prep/cook time, equipment
  - Source attribution with access date and license
- 7 sources (Wikipedia, USDA, the original menu transcription)

#### Site (`site/`)
- Astro 5 with Content Collections + Zod schemas (compile-time validation)
- Tri-lingual i18n routing: `/zh/`, `/en/`, `/yue/`
- Metro / Windows-Phone-inspired design with W3CSS Metro palette
  (印章紅, blue, orange, green, teal, brown, purple, ink-near-black)
- Sticky top navigation with 中/粵/En pivot tabs
- Homepage with progress bar and per-category Live Tile grid
- Category browse pages with dish-card grid
- Dish detail page with hero band, two-column layout, ingredient table,
  numbered method steps with chips for temperature/time, source footnotes
- Stub pages for sauces and ingredients
- Language-fallback indicator when a body field is missing in the chosen locale
- 576 pages built; deploys to GitHub Pages via official `withastro/action@v3`

#### Pipeline (`pipeline/`)
- Python 3.11 package, conda env `cantopedia`
- Pydantic models mirroring the Zod schemas (parity-verified at validate time)
- Hand-transcription of all 66 dishes + 110 unique ingredients in
  `pipeline/transcription.py` — the project's primary-source data
- Click-based CLI: `python -m pipeline {init|validate|status|fetch}`
- License-clean source adapters: Wikipedia (zh/en/yue summary) + Wikimedia
  Commons (image search) with 30-day on-disk JSON cache
- Idempotent `pipeline init` generates stubs from transcription
- `pipeline validate` runs full schema + cross-reference checks

#### CI / Deploy
- `.github/workflows/deploy.yml` — Astro build + Pages publish on push to main
- `.github/workflows/ci.yml` — Python schema validation + Astro check + build
  on PRs and main

### Decisions / Architecture

- Pipeline runs **locally**, never in CI — fetching needs cache and human review
- `data/` is the project's source of truth, committed to git
- The synthesize layer (Claude API) is intentionally **not implemented**;
  all method enrichment was hand-authored, ensuring quality

### Known limitations / deferred

- No images on dishes yet — Wikimedia Commons image search is wired but
  not run; Unsplash / Pexels API keys present but no image-attach pipeline
- Community contribution flow (PR templates, image submission, code-of-conduct)
  is planned for v0.2
- Some `prep` fields in earlier ingredient stubs lack tri-lingual coverage
  beyond Chinese — these can be incrementally enriched

## Roadmap

- **v0.2**: photos (Wikimedia + Unsplash); community-contribution flow;
  CONTRIBUTING + CODE_OF_CONDUCT; per-image attribution UI
- **v0.3**: nutrition calculator (sum from ingredient nutrition_per_100g);
  one-click A4 print stylesheet; offline PWA
- **v1.0**: 100+ dishes (beyond the original 66 menu), search by ingredient,
  user accounts (giscus + GitHub Discussions for comments)
