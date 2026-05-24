# 粵食典 · Cantopedia

> A tri-lingual, citation-traceable open-source codex of 66 dishes from a hand-written 港式茶餐廳 menu sheet.
> 三語、可溯源、由 66 道港式茶餐廳菜單延伸的開源粵菜典。

中文版 README → [`README.zh.md`](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE-CODE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](./LICENSE-CONTENT)
[![Status](https://img.shields.io/badge/status-v0.1--alpha-orange.svg)](./CHANGELOG.md)

---

## What this is

A **structured, tri-lingual cookbook** anchored on a real Hong Kong 茶餐廳
menu (六張水牌, 66 道菜). Every dish is presented in:

- **粵語本字 + 粵拼 (Jyutping)** — the dish as it appears in Hong Kong
- **普通話 (Mandarin)** — for mainland readers and learners
- **English** — for diaspora and curious cooks worldwide

Method, history, equipment, allergens, and procurement notes are augmented
from license-clean references (Wikipedia, Wikimedia Commons, USDA FoodData
Central, Hong Kong government terminology, CC-licensed blogs). Every claim
in a recipe carries a citation back to its source.

## What this is *not*

- Not another recipe blog. We do not republish copyrighted recipes.
- Not a translation of an existing English cookbook.
- Not AI-generated slop. Every method goes through human review before
  it leaves `method_status: draft`.

## Quick start

```bash
# Browse the live site
open https://shepherdloveyou.github.io/cantopedia

# Or run locally
git clone https://github.com/ShepherdLoveYou/cantopedia.git
cd cantopedia/site
pnpm install
pnpm dev
```

## Repository layout

```
data/             Source of truth — YAML recipes, sauces, ingredients, sources
pipeline/         Python research pipeline (conda env: cantopedia)
site/             Astro 5 static site with i18n + Pagefind search
raw_materials/    The six original menu photographs (CC BY-SA 4.0)
scripts/          One-off helpers (HEIC conversion, etc.)
docs/             Design spec and architecture notes
```

## Licenses

This project uses a **dual-license** model, consistent with open-source food
publishing practice:

| What | License | File |
|------|---------|------|
| **Code** (pipeline, site source, scripts, workflows) | MIT | [`LICENSE-CODE`](./LICENSE-CODE) |
| **Content** (recipes, ingredients, sauces, illustrations, menu photos) | CC BY-SA 4.0 | [`LICENSE-CONTENT`](./LICENSE-CONTENT) |
| **Third-party images** (Wikimedia, Unsplash, Pexels, AI-generated) | Per-image — see metadata | In each dish YAML |

If you fork or build on top of this project, please:
- Keep the dual-license arrangement.
- Carry over per-image attribution and licenses.
- Cite this repository upstream.

## Contributing

Contributor flow opens in **v0.2**. Until then, please open an issue if you
spot a factual error, a bad translation, or a license concern, and we will
address it.

## Acknowledgements

- The 66-dish menu, lovingly hand-written by a 茶餐廳 cook in Hong Kong style.
- Wikimedia Commons contributors for license-clean food photography.
- The HK government's [bilingual food-and-beverage terminology database](https://www.edb.gov.hk/).
- USDA FoodData Central for ingredient nutrition data.

## Status

**v0.1-alpha** — initial scaffold, 66 dishes as `stub`, 1 demo dish complete,
site deployed to GitHub Pages. See [`docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md`](./docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md)
for the full design.
