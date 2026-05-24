# Cantopedia · 粵食典 · v0.1 Design Spec

- **Project name**: `cantopedia`
- **Display name**: 粵食典 · Cantopedia · Cantonese Recipe Codex
- **GitHub**: https://github.com/ShepherdLoveYou/cantopedia
- **Created**: 2026-05-24
- **Owner**: yunfansong0@gmail.com (GitHub: ShepherdLoveYou) — sole maintainer for v0.1
- **Status**: Approved — execution in progress (user delegated full v0.1-alpha during 9 h AFK on 2026-05-24)
- **Target deliverable**: A public, tri-lingual (Cantonese / Mandarin / English) static recipe site covering 66 dishes from a hand-written 港式茶餐廳 menu sheet, deployed to GitHub Pages

---

## 1. Problem & Motivation

The author possesses six photographs of a hand-written 港式茶餐廳 "出品配料表" listing 66 numbered dishes (炒飯 / 炒麵 / 粥品 / 焗飯 / 湯品 / 主菜 / 等). Each entry contains only the dish name and ingredient portions — **no cooking method, fire control, seasoning ratios, history, or photos**. The goal is to turn this into a polished open-source resource that:

1. Preserves the original menu as structured data (the irreplaceable raw material).
2. Augments each dish with method, technique, history, and imagery sourced from **license-clean** references.
3. Presents the content in **Cantonese (本字 + 粤拼) / Mandarin / English**, all three first-class.
4. Is published under permissive open licenses suitable for fork / translation / academic citation.

The project is **not** another recipe blog. It is a structured, citation-traceable, tri-lingual cookbook anchored on a specific Hong Kong menu, with the engineering rigor of a documentation site.

---

## 2. Foundational Decisions (confirmed during brainstorming)

| # | Decision | Value |
|---|---|---|
| 1 | Output form | Static website (GitHub Pages) |
| 2 | Primary audience | Cantonese / Hong Kong diaspora; tri-lingual presentation (粤本字 + 粤拼 / 中 / En) |
| 3 | v0.1 dish scope | All 66 dishes from menu sheets; ingredient table mandatory, method incremental |
| 4 | Data model | Rich (≥ 25 fields per dish, see §6) |
| 5 | Code license | MIT |
| 6 | Content license | CC BY-SA 4.0 |
| 7 | Imagery | Clean sources only (Wikimedia / Unsplash / Pexels / AI-generated). Community photo intake deferred to v0.2+ |
| 8 | Contribution model | Solo for v0.1, community PR flow opens v0.2+ |
| 9 | Research source policy | "Clean source + fact extraction" — direct ingest only from CC-compatible sources (Wikipedia, Wikimedia, USDA, HK gov terminology, permissioned CC blogs); other sources only as **fact reference**, content rewritten in original prose with cite |
| 10 | Tech stack | Astro 5 + Content Collections (site) · Python 3.11 in conda env `cantonese-cuisine` (research pipeline) |
| 11 | Visual style | Traditional Chinese editorial (宋體 主導, 印章紅 點綴, optional vertical headings) — base Astro Cactus, heavily restyled |
| 12 | Deployment | GitHub Pages via official `withastro/action`; data pipeline runs locally, not in CI |

---

## 3. Architecture

### 3.1 Two-pillar separation

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│  pipeline/  (Python)        │       │  site/  (Astro 5)           │
│  conda env: cantonese-      │  ──►  │  pnpm + Node 22              │
│  cuisine, Python 3.11       │ data/ │  GitHub Pages                │
│  research / scrape / rewrite│       │  render / i18n / search      │
│  / validate                 │       │                              │
└─────────────────────────────┘       └─────────────────────────────┘
              │                                    │
              └──────────►  data/  ◄───────────────┘
                           (committed YAML/JSON — the project's true asset)
```

**Rationale**
- The pipeline produces `data/*.yaml` + license-clean images. Those files are committed and are the project's source of truth.
- The pipeline itself runs **locally**, not in CI. Wikipedia / USDA fetches need cache + retry + human review; CI is the wrong place.
- The site build is a pure function of `data/`. CI completes in ~30 s.
- Either pillar can be swapped (e.g., migrate site/ to Hugo later) without touching the other.

### 3.2 Repo layout

```
cantopedia/
├── README.md                  # English (GitHub landing)
├── README.zh.md               # Chinese
├── LICENSE-CODE               # MIT (covers pipeline/ and site/ source)
├── LICENSE-CONTENT            # CC BY-SA 4.0 (covers data/ and site/src/content)
├── CONTRIBUTING.md            # Stub in v0.1; full guide in v0.2
│
├── data/                      # ★ Source of truth — committed
│   ├── dishes/                # 66 × dish-<id>.yaml
│   ├── sauces/                # Shared sauces (豉汁, 咕咾汁, 葡汁, 白汁...)
│   ├── ingredients/           # Ingredient master + nutrition + procurement
│   ├── categories.yaml        # 8 categories
│   ├── glossary.yaml          # Tri-lingual unit/term conversions (件/兩/磅/碗)
│   └── sources/               # Citation registry (wikipedia / usda / hk-gov / manual)
│
├── pipeline/                  # Python research pipeline
│   ├── environment.yml        # conda env spec
│   ├── pyproject.toml
│   ├── pipeline/
│   │   ├── sources/           # adapters: wikipedia, wikimedia_commons, usda, hk_terminology, cc_blogs, unsplash, pexels
│   │   ├── extract.py         # raw → facts
│   │   ├── synthesize.py      # Claude API → method draft (optional, key-gated)
│   │   ├── images.py          # HEIC→WebP/AVIF, AI fallback
│   │   ├── validate.py        # pydantic mirror of Zod schemas
│   │   └── cli.py             # python -m pipeline init|fetch|synthesize|images|validate|status
│   ├── cache/                 # .gitignored
│   └── tests/                 # pytest
│
├── site/                      # Astro 5 site
│   ├── package.json
│   ├── astro.config.mjs       # site, base, i18n config
│   ├── src/
│   │   ├── content/
│   │   │   ├── config.ts      # Zod schemas
│   │   │   └── (symlink to ../../data/)
│   │   ├── pages/
│   │   │   ├── [locale]/      # /zh/ /en/ /yue/
│   │   │   │   ├── index.astro
│   │   │   │   ├── dishes/[id].astro
│   │   │   │   ├── sauces/[id].astro
│   │   │   │   ├── ingredients/[id].astro
│   │   │   │   ├── browse/[category].astro
│   │   │   │   ├── search.astro
│   │   │   │   └── about.astro
│   │   ├── components/        # JyutpingRuby, IngredientTable, MethodSteps, SauceCard, LangSwitcher, SourceFootnote, MethodStatusBadge, CategoryNav, SealLogo
│   │   ├── i18n/              # UI strings: zh.json / en.json / yue.json
│   │   └── styles/            # Tokens (colors, type scale) + global stylesheet
│   ├── public/
│   │   └── images/            # Multi-size WebP/AVIF, pipeline-output
│   └── tests/                 # vitest
│
├── .github/workflows/
│   ├── ci.yml                 # PR: pytest + vitest + schema validation
│   ├── deploy.yml             # main: Astro build + Pages deploy
│   └── pipeline.yml           # manual: refresh data/ via the pipeline
│
└── docs/superpowers/specs/
    └── 2026-05-24-cantonese-cuisine-design.md   # This document
```

### 3.3 Single-dish data flow

```
Step 1  human: write data/dishes/004-jiu-yim-zhai-yu-daan.yaml skeleton
              (id, names, category, ingredients from menu, method_status: stub)

Step 2  local: $ python -m pipeline fetch dish 004
              → fetches Wikipedia(yue/zh/en) + HK gov terminology
                       + Wikimedia Commons (image search)
                       + CC-blog whitelist + USDA (ingredient nutrition)
              → writes cache/004/*.json + emits facts into data/dishes/004.yaml.draft

Step 3  local: $ python -m pipeline synthesize dish 004
              → injects facts + dish skeleton into Claude API prompt
              → generates tri-lingual method draft with mandatory inline cites [#source_id]
              → writes data/dishes/004.yaml.draft (method_status: draft)

Step 4  human review: edit yaml, fix factual errors, tighten language, confirm cites
              → method_status: complete

Step 5  local: $ python -m pipeline validate
              → full schema check + reference integrity + image presence
              → on pass: move *.draft to *.yaml

Step 6  $ git commit; git push
              → CI runs vitest + schema → Astro build → deploy Pages
```

**Quality gates**
- Step 5 failure → blocked by local pre-commit hook.
- Step 6 CI failure → blocked merge.
- `method_status: draft` → site renders a "做法待校對" badge and hides the step body, exposing only ingredient + sources.

---

## 4. License Architecture

| Path | License | Notes |
|---|---|---|
| `pipeline/**`, `site/src/**` (excl. content), `scripts/**`, `*.config.*` | MIT (`LICENSE-CODE`) | Standard permissive |
| `data/**`, `site/src/content/**`, `public/images/**` (own work) | CC BY-SA 4.0 (`LICENSE-CONTENT`) | All recipe text, illustrations |
| `public/images/**` (third-party) | License of the original (Wikimedia Commons CC0/CC-BY-SA, Unsplash, Pexels, AI-generated) | Per-image `credit` field in dish schema, surfaced in UI |

The repo root `README.md` explicitly states the dual-license arrangement and links to both.

---

## 5. Zod Schemas (full, definitive)

Located at `site/src/content/config.ts`. The pipeline mirrors these via `pipeline/pipeline/validate.py` using pydantic (kept in sync by a parity test).

```ts
import { defineCollection, reference, z } from 'astro:content';

const TriLangText = z.object({
  yue_hant: z.string(),
  jyutping: z.string(),
  zh: z.string(),
  en: z.string(),
});

const TriLangBody = z.object({
  yue: z.string().optional(),
  zh: z.string(),         // mandatory; serves as fallback
  en: z.string().optional(),
});

const SourceRef = z.object({
  source_id: z.string(),
  url: z.string().url().optional(),
  accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
});

const Ingredient = z.object({
  ref: reference('ingredient'),
  qty: z.number().positive(),
  unit: z.enum(['件','兩','錢','磅','碗','匙','茶匙','克','毫升','個','條','粒','滴','片','份','適量']),
  prep: TriLangText.partial().optional(),
});

const MethodStep = z.object({
  order: z.number().int().positive(),
  body: TriLangBody,
  time_seconds: z.number().int().optional(),
  temperature_c: z.number().optional(),
  cite: z.array(z.string()).optional(),
});

export const collections = {
  dish: defineCollection({
    type: 'data',
    schema: z.object({
      id: z.string().regex(/^\d{3}-[a-z-]+$/),
      menu_no: z.number().int().positive(),
      names: TriLangText,
      category: reference('category'),
      ingredients: z.array(Ingredient).min(1),
      sauce: reference('sauce').optional(),
      variants: z.array(reference('dish')).optional(),
      servings: z.number().int().positive().default(2),
      difficulty: z.enum(['easy','medium','hard','pro']).optional(),
      time_minutes: z.object({
        prep: z.number().int().nonnegative(),
        cook: z.number().int().nonnegative(),
      }).optional(),
      equipment: z.array(z.enum(['wok','rice_cooker','steamer','oven','pressure_cooker','chinese_cleaver','blender','smoker','sous_vide'])).optional(),
      method_status: z.enum(['stub','draft','complete']),
      method: z.array(MethodStep).optional(),
      tips: z.array(TriLangBody).optional(),
      history: TriLangBody.optional(),
      allergens: z.array(z.enum(['gluten','peanut','tree_nut','shellfish','dairy','egg','soy','sesame','sulfite'])).optional(),
      images: z.array(z.object({
        path: z.string(),
        source_id: z.string(),
        license: z.enum(['CC0','CC-BY-2.0','CC-BY-SA-3.0','CC-BY-SA-4.0','Unsplash','Pexels','AI-generated']),
        credit: z.string(),
      })).optional(),
      sources: z.array(SourceRef).min(1),
      created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),

  sauce: defineCollection({
    type: 'data',
    schema: z.object({
      id: z.string(),
      names: TriLangText,
      base_ingredients: z.array(Ingredient),
      method: z.array(MethodStep),
      yield_ml: z.number().positive(),
      storage: TriLangBody.optional(),
      used_in: z.array(reference('dish')).optional(),
      sources: z.array(SourceRef).min(1),
    }),
  }),

  ingredient: defineCollection({
    type: 'data',
    schema: z.object({
      id: z.string(),
      names: TriLangText,
      category: z.enum(['meat','seafood','vegetable','grain','sauce','spice','dairy','egg','noodle']),
      nutrition_per_100g: z.object({
        kcal: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
        carb_g: z.number(),
      }).optional(),
      procurement: z.object({
        availability: z.array(z.enum(['hk','mainland','us','eu','sea','jp_kr','au'])),
        alternatives: z.array(reference('ingredient')).optional(),
        notes: TriLangBody.optional(),
      }).optional(),
      sources: z.array(SourceRef).min(1),
    }),
  }),

  category: defineCollection({
    type: 'data',
    schema: z.object({
      id: z.string(),
      names: TriLangText,
      description: TriLangBody,
      sort_order: z.number().int(),
    }),
  }),

  source: defineCollection({
    type: 'data',
    schema: z.object({
      id: z.string(),
      type: z.enum(['wikipedia','wikimedia-commons','usda','hk-gov','academic','cc-blog','book','manual']),
      title: z.string(),
      url: z.string().url().optional(),
      authors: z.array(z.string()).optional(),
      publisher: z.string().optional(),
      license: z.string(),
      accessed: z.string(),
      isbn: z.string().optional(),
    }),
  }),
};
```

### 5.1 Sample dish record

```yaml
# data/dishes/016-mat-zap-cha-siu-faan.yaml
id: 016-mat-zap-cha-siu-faan
menu_no: 16
names:
  yue_hant: 蜜汁叉燒飯
  jyutping: mat6 zap1 caa1 siu1 faan6
  zh: 蜜汁叉烧饭
  en: BBQ Pork Rice with Honey Glaze
category: rice
ingredients:
  - { ref: cha-siu, qty: 12, unit: 件, prep: { en: "sliced ~5mm thick" } }
  - { ref: gai-laan, qty: 6, unit: 件, prep: { en: "blanched" } }
  - { ref: jasmine-rice, qty: 1, unit: 碗 }
sauce: honey-glaze
servings: 1
difficulty: medium
time_minutes: { prep: 30, cook: 45 }
equipment: [oven]
method_status: stub
sources:
  - { source_id: menu-2025-handwritten, accessed: 2026-05-24, note: "from user's 茶餐廳 menu, item #16" }
created: 2026-05-24
updated: 2026-05-24
```

---

## 6. i18n Strategy

**URL design**: `/zh/dishes/<id>` · `/en/dishes/<id>` · `/yue/dishes/<id>`. No bare default-language paths (avoids SEO duplication). Root `/` redirects (302) to `/zh/`.

**Language fallback** (handles missing `yue` / `en` long-form bodies):

```
display yue → missing → display zh (with "fallback" badge)
display en  → missing → "[Translation pending]" + Chinese original + "Help us translate" link
display zh  → mandatory; never falls back
```

**Dish header rendering**:

```
┌───────────────────────────────────────────────────────────┐
│  蜜汁叉燒飯                                                │ ← yue_hant H1
│  mat6 zap1 caa1 siu1 faan6                               │ ← jyutping, small grey
│  · 蜜汁叉烧饭 · BBQ Pork Rice with Honey Glaze            │ ← zh + en inline
└───────────────────────────────────────────────────────────┘
```

**Unit tri-lingual mapping** (lives in `glossary.yaml`):

| YAML | zh display | en display |
|---|---|---|
| `件` | 件 | pieces |
| `兩` | 兩 | tael (~37.5 g) |
| `磅` | 磅 | lb (~453 g) |
| `碗` | 碗 | bowl |
| `匙` | 匙 | tbsp |
| `茶匙` | 茶匙 | tsp |

Hover or tap reveals conversion tooltip on first occurrence per page.

**Jyutping ruby** (toggleable): `<JyutpingRuby>` renders Cantonese characters with romanisation overhead, similar to Japanese furigana. Default on for `/yue/` and `/zh/`, off for `/en/`.

---

## 7. Python Research Pipeline

### 7.1 Five layers

```
┌─ L1 Sources (adapters) ──────────────────────────────────────────┐
│  wikipedia.py        (zh/en/yue API; title/intro/sections)       │
│  wikimedia_commons.py (image search + metadata + license)        │
│  usda.py              (FoodData Central API)                     │
│  hk_terminology.py    (HK government Chinese-English food terms) │
│  cc_blogs.py          (whitelist; v0.1 = The Woks of Life RSS    │
│                        with author permission)                   │
│  unsplash.py / pexels.py (image search; tri-lingual queries)     │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─ L2 Cache ───────────────────────────────────────────────────────┐
│  pipeline/cache/<source>/<key>.json  (sqlite-cache alternative)  │
│  Default 30-day TTL; --force-refresh override                    │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─ L3 Extract ─────────────────────────────────────────────────────┐
│  Extracts uncopyrightable facts from raw payload:                │
│    - cooking_temp / time                                         │
│    - ingredient_ratios                                           │
│    - alternative_names (script variants, regional)               │
│    - cultural_facts (origin, etymology, occasion)                │
│  Outputs dict<fact_key, {value, source_id, cite_anchor}>.        │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─ L4 Synthesize (Claude API; key-gated) ──────────────────────────┐
│  Prompt template:                                                │
│    SYSTEM: "Write a tri-lingual cooking method for <dish_name>   │
│              using ONLY the facts below. Cite each clause with   │
│              [#source_id]. Cantonese (本字) / Mandarin / English.│
│              Original prose; no copying from sources."           │
│    USER:   <facts + dish skeleton + sources>                     │
│  Output → data/dishes/<id>.yaml.draft (method_status: draft).    │
│  Human review converts to method_status: complete.               │
│  Without API key: skip; all dishes remain `stub`.                │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─ L5 Validate ────────────────────────────────────────────────────┐
│  pydantic models mirror Zod (parity test ensures equivalence).   │
│  Checks: reference integrity, image presence, license whitelist, │
│           ≥1 source, method non-empty if status=complete.        │
│  Pass → atomic replace *.draft → *.yaml.                         │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 CLI surface

```bash
# All run inside conda env `cantonese-cuisine`
python -m pipeline init                       # scan menu images → 66 stub yaml
python -m pipeline fetch dish 016             # fetch all sources → cache
python -m pipeline fetch all --since 30d      # batch incremental
python -m pipeline synthesize dish 016        # Claude API → method draft
python -m pipeline images dish 016 --search   # Wikimedia/Unsplash/Pexels
python -m pipeline images dish 016 --generate # AI fallback
python -m pipeline validate                   # full schema validation
python -m pipeline status                     # progress: stub/draft/complete counts
```

### 7.3 Source policy enforcement

Each adapter declares its **content license**. Layer L3 records `source.license` in `source.yaml`. Layer L5 enforces:

- If `source.license` ∈ {CC0, CC-BY-*, Public Domain, MIT, BSD, "permission-granted"} → text may be quoted verbatim with attribution.
- Otherwise → adapter must return **only structured facts**, not raw prose. Quoting raw prose at the synthesis layer triggers a validation error.

---

## 8. Site UX

### 8.1 Pages

| Route | Purpose |
|---|---|
| `/zh/` (and `/en/`, `/yue/`) | Homepage: hero, category browser, featured dishes, recent updates |
| `/zh/browse/<category>` | All dishes in a category |
| `/zh/dishes/<id>` | Single dish detail |
| `/zh/sauces/<id>` | Single sauce detail (cross-linked from dishes) |
| `/zh/ingredients/<id>` | Single ingredient (nutrition + procurement + dishes using it) |
| `/zh/search` | Pagefind search UI |
| `/zh/about` | Project intro, dual-license, contributor list |

### 8.2 Component inventory

| Component | Responsibility |
|---|---|
| `<JyutpingRuby>` | Renders 本字 with optional jyutping overhead |
| `<IngredientTable>` | Tri-lingual ingredient list with unit conversion tooltips |
| `<MethodSteps>` | Numbered steps + inline cite chips + temperature/time icons |
| `<SauceCard>` | Mini card linking to a shared sauce page |
| `<SourceFootnote>` | Per-cite expandable footnote (URL, accessed date, license) |
| `<LangSwitcher>` | Top-right: 中 / En / 粤 |
| `<MethodStatusBadge>` | stub / draft / complete pill |
| `<CategoryNav>` | Eight-category navigation grid |
| `<SealLogo>` | SVG 朱紅 seal in 篆書 "粵" (top-left, marks tri-lingual brand) |

### 8.3 Search

Pagefind. Build-time index of all `data/*.yaml`. Browser-side search; CJK tokenisation built in. Searches "叉燒", "BBQ pork", and "cha siu" all hit the same dish.

### 8.4 Accessibility & performance targets

- All images carry `alt` (pipeline-enforced); tri-lingual alt where appropriate.
- Mobile-first responsive; v0.1 ships no PWA (deferred to v0.2+).
- Lighthouse targets: Accessibility 100 · Performance 95 · SEO 100.

---

## 9. Visual Design (Traditional Chinese editorial)

**Base template**: `astro-theme-cactus` (MIT), heavily restyled.

**Fonts** (all Google Fonts, free):

- Chinese body: **Noto Serif SC** (思源宋體)
- English body: **Crimson Pro** / **EB Garamond**
- Display accents: **Cormorant Garamond**
- Latin meta (jyutping, labels): **Inter**

**Palette**:

```
Background       #FDFBF7   (宣紙 white)
Body text        #2B1810   (焙茶 brown)
Secondary text   #6B5544   (陳年木)
Divider          #E5DCC9   (米黃)
Accent (sparing) #B71C1C   (印章 red) — H1 left bracket, cite numbers, seal logo
Method backplate #F8F2E4   (deeper cream)
```

**Visual rules**:

- Headings: solid colour, no gradients. Vertical-text variant available for H1 on dish pages (default horizontal, toggleable).
- Images: rounded 4 px max (no app-feel large radii).
- Cards: 1 px米黃 divider, no shadows.
- No dark mode in v0.1 (food colour suffers in dark UIs; magazine night reading is not the primary use case).
- Single SVG 朱紅 seal logo (篆書 "粵") top-left.
- Hero may use a faint Wikimedia Commons public-domain rice-paper texture as background.

**Anti-patterns** (explicitly avoided): neon / dark cyber, glassmorphism, large radius (> 8 px), gradient titles, sans-only typography, 3D ornament, animation chrome.

---

## 10. Deployment

GitHub Pages via the official Astro Action:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Pages
on: { push: { branches: [main] }, workflow_dispatch: }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
        with:
          path: ./site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`astro.config.mjs`:

```ts
export default defineConfig({
  site: 'https://shepherdloveyou.github.io',
  base: '/cantopedia',
  i18n: { defaultLocale: 'zh', locales: ['zh', 'en', 'yue'], routing: { prefixDefaultLocale: true } },
  integrations: [pagefind()],
});
```

**Capacity check** (GitHub Pages limits): 1 GB repo (we project ~50 MB) · 100 GB/month bandwidth (small project) · 10 builds/hour · automatic HTTPS. Comfortable headroom. Migration to Cloudflare Pages later requires a two-line workflow change.

**Custom domain**: deferred; if claimed later, add `site/public/CNAME` + Pages settings.

---

## 11. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Schema parity | pytest | pydantic ↔ Zod equivalence (golden YAML fixtures pass both) |
| Pipeline unit | pytest | adapters, extract, validate (mocked HTTP) |
| Pipeline integration | pytest (opt-in via env flag) | one real Wikipedia hit per adapter, cached |
| Site components | vitest | JyutpingRuby, IngredientTable, MethodSteps, LangSwitcher |
| Site build | Astro build in CI | breaks on any schema violation |
| End-to-end | Playwright | dish detail page renders all sections; LangSwitcher round-trip; search returns ≥1 hit for "叉燒" |
| Accessibility | axe-core (vitest) | every page template free of axe violations |
| Image pipeline | pytest | round-trip HEIC → WebP @ 3 sizes, alt-text presence enforced |

---

## 12. v0.1 Roadmap

| # | Milestone | Days | Deliverable |
|---|---|---|---|
| M1 | Repo skeleton | 0.5 | Repo created · directory layout · dual LICENSE · tri-lingual READMEs · CI workflow · conda env · `astro init` |
| M2 | Schema + one hand-authored dish end-to-end | 1.0 | `content/config.ts` · pydantic mirror · dish #16 (蜜汁叉燒飯) fully filled (method_status: complete) · site build passes |
| M3 | Pipeline foundation | 2.0 | source adapters (wikipedia / wikimedia / usda / hk_terminology) · cache · extract · validate · CLI |
| M4 | All 66 dishes as `stub` | 1.0 | `python -m pipeline init` parses menu images → 66 stub yaml |
| M5 | Site UX (with Traditional Chinese restyling) | 4.0 | Homepage · category · dish · sauce · search · i18n routes · Lighthouse targets met · 印章紅 styling complete |
| M6 | Synthesize + human review for 8 signature dishes | 3.0 | 8 dishes at `method_status: complete`; remaining 58 still `stub` |
| M7 | Image pipeline + signature-dish imagery | 1.5 | 8 dishes have license-clean images (Wikimedia/Unsplash/AI) |
| M8 | Deploy + smoke | 0.5 | Live at https://shepherdloveyou.github.io/cantopedia/ |
| M9 | Docs + release | 1.0 | READMEs final · CHANGELOG · `v0.1.0` tag |
| | **Total** | **~14.5 work days** (≈ 3 weeks full-time solo) | |

**Definition of "v0.1 done"**:
- 66 dishes published with ingredient tables; ≥ 8 have complete tri-lingual method.
- Tri-lingual site fully navigable in 中 / En / 粤.
- All copyright obligations met (per-image credit, per-source citation).
- Lighthouse: Accessibility 100, SEO 100, Performance ≥ 95.
- Deployed to GitHub Pages with green CI on `main`.

---

## 13. v0.2+ Backlog (out of scope for v0.1)

- Community contribution flow (CONTRIBUTING, PR template, recipe submission guide, CODE_OF_CONDUCT).
- Embedded videos (YouTube CC-licensed clips).
- "Today's pick" / seasonal suggestions.
- One-click A4 menu-card print stylesheet.
- Offline PWA.
- PDF e-book export from the same data.
- Nutrition calculator (per recipe summation).
- Reader comments via giscus → GitHub Discussions.
- Additional romanisation systems (Yale, IPA).

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pipeline produces inaccurate / hallucinated methods | All `draft` content hidden in UI until human-promoted to `complete`; status badge always visible. Schema mandates `cite` on every step. |
| License drift (a contributor adds a copyrighted image) | Schema requires `license` per image, restricted to whitelist. CI blocks merge. |
| Astro Content Collections API change | Pin `astro` major version in `package.json`; CI pulls reproducible lockfile. |
| Source unavailable / API rate-limited | Local cache + opt-in `--force-refresh`; pipeline doesn't run in CI so build is never blocked. |
| Solo bus factor | All decisions documented in this spec + per-PR commit messages; conda env spec checked in; `data/` is portable to any other static-site generator. |
| Aesthetic regression in Traditional Chinese restyle (M5 takes longer than budget) | Hard cap at 4 days; if over budget, fall back to base Astro Cactus theme for v0.1, defer restyle to v0.2. |

---

## 15. Open Questions Deferred to Implementation Plan

- Exact ID slug scheme for sauces and ingredients (currently free-form kebab-case).
- Pagefind config tuning for CJK tokenisation thresholds.
- Whether to host pipeline output as a separate `data-only` release tag for downstream consumers (defer to v0.2).
- Whether to add a JSON-LD `Recipe` schema.org export per page (likely yes, but micro-decision for implementation).
- Concrete Claude API prompt templates for `synthesize` (will be drafted during M6).

---

## 16. Appendix A — Dish Inventory (from menu sheets)

The 66 dishes, by category, as transcribed from the user's six menu photos:

**頭盤 / 小食 (7)**: 1 脆皮齋春捲 · 2 京式煎鍋貼 · 3 沙律炸蝦角 · 4 椒鹽炸魚蛋 · 5 蒜香焗乾骨 · 6 四川紅油抄手 · 7 酥炸雞翼

**湯 / 雲吞 (3)**: 8 窩雲吞 · 9 雲吞湯 · 10 例湯

**炒飯 (11)**: 11 大富豪炒飯 · 12 揚州炒飯 · 13 雞粒炒飯 · 14 蝦仁炒飯 · 15 福建炒飯 · 16 蜜汁叉燒飯 · 17 粟米魚柳飯 · 18 番茄洋蔥豬扒/雞扒飯 · 19 咖喱薯仔牛腩飯 · 20 豆仔牛腩飯 · 21 絲苗白飯

**炒麵 / 炒米 / 炒河 (8)**: 22 招牌炒麵 · 23 海鮮炒麵 · 24 沙爹牛肉麵 · 25 家鄉炒米 · 26 星洲炒米 · 27 干炒牛河 · 28 柱侯牛腩炒河 · 29 豉椒雞片炒河

**湯米線 / 喇沙 (5)**: 30 海南雞喇沙湯米線 · 31 蝦球喇沙湯米線 · 32 叉燒喇沙米線 · 33 柱侯牛腩湯米線 · 34 雪菜肉絲湯米線

**焗飯 / 意粉 (5)**: 35 茄汁豬扒飯/意粉 · 36 意式香草焗海鮮/意粉 · 37 白汁雞扒飯/意粉 · 38 葡汁焗龍利柳飯/意粉 · 39 葡汁鴛鴦飯/意粉

**粥品 (5)**: 40 沙田雞粥 · 41 海皇粥 · 42 薑蔥魚球粥 · 43 皮蛋瘦肉粥 · 44 蝦球滑雞粥

**炸點 / 主菜 (22)**: 45 油條 · 46 海南雞飯 · 47 豉汁牛/雞/蝦 · 48 薑汁牛絲/雞絲飯 · 49 咕嚕雞/豬飯 · 50 蒜汁脆皮雞 · 51 豉汁豆仔雞片/牛片 · 52 宮保雞 · 53 檸檬酥雞 · 54 椒鹽蝦 · 55 西蘭花蝦球 · 56 豉椒蝦球 · 57 油泡龍利球 · 58 椒鹽三鮮 · 59 椒鹽鮮尤 · 60 豉椒炒牛肉/雞片 · 61 薑汁干牛絲/雞絲 · 62 芥蘭炒牛肉/雞片 · 63 黑椒蘑菇蔥爆牛肉/雞片 · 64 京都肉排 · 65 椒鹽肉排 · 66 菠蘿咕嚕肉

Variants (e.g., 47 豉汁牛 / 豉汁雞 / 豉汁蝦) are modelled via the `variants` reference, all sharing the same `sauce` (豉汁).
