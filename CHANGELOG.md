# Changelog

All notable changes to Cantopedia will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha] — 2026-05-24

Initial scaffold. See [design spec](./docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md).

### Added
- Repository skeleton with dual-license arrangement (MIT for code, CC BY-SA 4.0 for content)
- Six original menu photographs (`raw_materials/menu_photos/`, CC BY-SA 4.0)
- 66 dish records as `stub` in `data/dishes/` (transcribed from menu photos)
- Zod schemas for `dish`, `sauce`, `ingredient`, `category`, `source` collections
- One end-to-end demo dish: `016-mat-zap-cha-siu-faan` (蜜汁叉燒飯) at `method_status: complete`
- Astro 5 static site with tri-lingual i18n routing (`/zh/`, `/en/`, `/yue/`)
- Traditional Chinese editorial styling (Noto Serif SC + Crimson Pro, 印章紅 accent, 宣紙 cream palette)
- Python research pipeline scaffold with Wikipedia, Wikimedia Commons, USDA, HK gov terminology adapters
- Pipeline CLI: `python -m pipeline {init|fetch|synthesize|images|validate|status}`
- Pagefind search with CJK tokenisation
- GitHub Pages deployment via official `withastro/action`

### Known limitations (deferred)
- `synthesize` requires an Anthropic API key (not configured in v0.1-alpha)
- Wikimedia Commons image search only; Unsplash/Pexels and AI generation deferred until API keys are configured
- 65 of 66 dishes remain at `method_status: stub` pending pipeline synthesis + human review
- No community contribution flow (planned for v0.2)
