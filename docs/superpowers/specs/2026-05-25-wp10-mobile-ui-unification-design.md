# Design: Windows 10 Mobile UI Unification

**Date**: 2026-05-25
**Branch**: feat/wp10-metroui
**Author**: ShepherdLoveYou (with Claude)
**Status**: Approved for implementation planning

---

## Goal

把 Cantopedia 全站 9 个页面类型按 **Windows 10 Mobile** 设计语言统一化。重构后每个页面看起来 / 用起来都像一个 WP10 Mobile app screen — 共享 chrome、共享 type 阶梯、共享配色、共享 motion、共享交互模式。

终态成功的判定：随机打开任何一个 URL，截图与一个虚构的 WP10 Mobile 原生 app 视觉对齐到 90%+。

## Background

`feat/wp10-metroui` 分支已经把 Hub（首页 + 8 分类 browse + /all 列表）做成 WP10 Hub pattern：横向滚动 panel + Metro tile 网格 + 翻面 cat-tile + 顶部 pivot strip。其余 5 个页面（Dish / Ingredient / Sauce / Search / 404）仍是早期阅读流风格，与 Hub 视觉语言完全断裂。

视觉断裂证据（probe 取证）：
- Hub `main` 用 `-apple-system` 字体栈 + 文字色 `rgb(25,25,25)`；Dish `main` 用 `"Noto Sans TC"` + `rgb(29,29,29)`（`site/probe-out/css-leak.json`）
- Footer 只在 Dish/Ingredient/Sauce 渲染，Hub 完全没 footer
- Hub 浅色透明背景；Dish 深色 hero + 浅色卡片 — 像两个产品
- 90 路由 sweep 截图中，Dish 与 Hub 类页面视觉风格完全不同（`site/probe-out/sweep/`）

## Section 0 — Bug 全景（按严重度）

### P0 阻断
- 跨页面设计语言断裂（Hub vs Dish）
- 8 个 category tile 只有 1 个有背景照片，其余实色 fallback

### P1 用户能察觉
- Hub 页缺 footer
- Dev server 端口不稳（4321 被占就 fallback，但 probe 写死 4321）
- `lib/hubScripts.ts:144/148/153` prev/next click + hub keydown handler 加了但无引用保存，teardown 无法 remove（Astro ClientRouter 重挂时累积）
- Theme nav 颜色首次 SSR 不从 dataTheme 同步

### P2 技术债
- 设计 token 不严格：12+ 档字号、4 档字重、px/rem 混用、6 处硬编码 `#fff`/`#1d1d1d`
- 20+ 处 `!important`（Metro CSS load 后覆盖临时解）
- 23 处 `as any` 把私有状态挂 DOM
- 测试覆盖率近零（只有 1 个 vitest 文件）

### P3 轻微
- `<a href="#">` 的 hub-pivot prev/next（应该用 button）
- Accordion 用 `label` + `cursor: pointer` 没 `role="button"`
- Search dev 模式无 pagefind 错误提示不够友好

## Section 1 — 视觉统一方向

**全站 WP10 Mobile 化**。每个页面映射到 WP10 Mobile 三大 page pattern 之一，再共享通用 Metro chrome（status bar + footer + type + color tokens + motion curves）。

| 页面 | WP10 Mobile pattern | 来源 |
|---|---|---|
| Hub 首页 | **Hub**（横向 panel 滚动） | WP8/10 People/Music hub |
| Browse 分类 | **Hub** 的一个 panel | 同上 |
| /all 列表 | **AppList** | WP10 App List（A-Z） |
| Dish 详情 | **Pivot**（4 tab swipe） | WP8/10 Mail/Calendar pivot |
| Ingredient 详情 | **Pivot**（2 tab） | 同上 |
| Sauce 详情 | **Pivot**（2 tab） | 同上 |
| Search | **AppList** + Metro flat input | WP10 Search 结果 |
| 404 | **Metro Empty State**（巨大数字 + tile） | WP10 系统错误屏 |
| 通用 chrome | Metro **status bar**（40px 黑栏）+ Metro **footer**（红条 + caps） | WP10 所有 app 共用 |

非 page-level 元素也全 Metro：输入框（Metro flat）、按钮（Metro tile / flat）、表格（AppList row）、长文（Metro plate flat 无影）。

## Section 2 — WP10 Mobile 设计 token（单一来源）

token 集中定义在 `src/layouts/BaseLayout.astro`，所有组件**只能**从这里取值。

| Token 类别 | 锁定值 | 备注 |
|---|---|---|
| **字号** | `--fs-caption: 0.7rem` / `--fs-tiny: 0.8rem` / `--fs-body: 0.9rem` / `--fs-panel: 1rem` / `--fs-title: 1.45rem` / `--fs-panorama-sm: 2.4rem` / `--fs-panorama: 3rem` | 7 档 |
| **字重** | `--fw-light: 200` / `--fw-regular: 400` / `--fw-medium: 500` | 3 档 |
| **letter-spacing** | `--ls-body: 0` / `--ls-meta: 0.02em` / `--ls-caps: 0.22em` | 3 档 |
| **间距** | `--sp-1: 4px` / `--sp-2: 8px` / `--sp-3: 12px` / `--sp-4: 16px` / `--sp-5: 24px` / `--sp-6: 40px` | 6 档 |
| **圆角** | `--radius: 0` | 旗帜性，全 0 |
| **阴影** | `--elev-0: none` / `.wp-tile.pressing` 是唯一例外 | flat |
| **tile pitch** | `--tile-unit: 70px` desktop / 56px mobile；`--tile-gap: 10px / 8px` | 已存在 |
| **配色** | Metro 16 色 (`--m-*`) + 7 theme tokens (`--t-*`) | 已存在 |
| **过渡曲线** | Fluent 5 curves (`--fluent-curve-*`) + 4 durations | 已存在 |

新增 `src/lib/tokens.test.ts`：vitest 用正则 scan `src/**/*.{astro,ts}` 检查所有 `font-size:` / `font-weight:` / `padding:` 值是否都在 token 集合内（设计回归护栏）。

## Section 2.5 — SOLID 应用

| 原则 | 怎么落地 |
|---|---|
| **S** Single Responsibility | Hub.astro 拆数据组装 vs panel 渲染；每个 page 模板只做"组装 + 路由 props"，UI 抽到组件 |
| **O** Open/Closed | Token 系统已开放扩展；新 tile 样式 = 新 `data-role="tile"` 配置，不改 base |
| **I** Interface Segregation | 删 CatTile 8-props 联合，改为直接用 Metro `data-role="tile"` 属性 |
| **L** Liskov | 不适用（Astro 静态组件无继承） |
| **D** Dependency Inversion | 不适用（静态站点抽象成本 > 收益） |

## Section 3 — 每页 WP10 Mobile 重设计

### 3.1 Dish detail（`[locale]/dishes/[id].astro`）
- 顶部 Hub-style pivot title strip（dish 名 + ‹ prev dish | next dish ›）
- 下方 wide tile-banner（`data-role="tile" data-size="wide"`，dish 照 cover，flat 0 圆角）
- 4 个 PivotTab：**配料 / 做法 / 小貼士 / 由來+引用源**
- Tab 切换 scroll-snap 或点击
- 每 tab 内容 Metro plate（flat 无影）
- 共享 BaseLayout 的 Metro footer

### 3.2 Ingredient detail（`[locale]/ingredients/[id].astro`）
- Hub-style pivot strip（食材名 + ‹ prev | next ›）
- Tile-banner 食材照（`data-role="tile" data-size="wide"`）
- 2 个 PivotTab：**介紹 / 用在哪些菜**（"用在哪些菜" 是 dish tile 网格）

### 3.3 Sauce detail（`[locale]/sauces/[id].astro`）
同 3.2，2 PivotTab：**介紹 / 用在哪些菜**

### 3.4 Search（`[locale]/search.astro`）
- Hub-style pivot strip "搜尋"
- 搜索框 Metro flat（无 border-radius / 1px ink border / 黑底白字 focus）
- 结果用 AppListPanel 风（缩略图 + 文字栈）

### 3.5 404（`404.astro`）
- 巨型 "404" 数字（`font-size: 8rem; font-weight: 200`）
- 三语副标 "Page not found"
- 一个 `data-role="tile" data-size="medium"` 链回 Hub

## Section 4 — 组件清单（γ' 路线 / Metro 5 激进用）

### 用 Metro 5 原生 `data-role` 替代（删除自写组件）
| 旧组件 / 自写部分 | 替换 |
|---|---|
| `metro-nav`（自写） | `<div data-role="app-bar">` |
| `CatTile.astro` 翻面动画 | `<div data-role="tile" data-effect="switch">` 或 `slide-up` |
| Hub 内嵌 `stat-tile-mt` | inline `<div data-role="tile" data-size="medium">` 数字 + label |
| Hub 内嵌 `util-tile` | inline `<div data-role="tile" data-size="small">` 图标 |
| Hub 内嵌 `featured-tile` cycle | `<div data-role="tile" data-size="wide" data-effect="slide-left">` + 多 slide |
| Browse panel 内 `dish-tile` | inline `<div data-role="tile" data-size="medium">` |
| AppListPanel 自写 row | `<ul data-role="listview">` |
| Dish hero（深色 + parallax） | `<div data-role="hero">` 或 `<div data-role="tile" data-size="wide">` 配 cover photo |

### 仍要自写（Metro 5 无对应）
| 新组件 | 职责 |
|---|---|
| `src/components/Hub.astro` | 横向 scroll-snap panel 容器 + 9 panel 组装（瘦身） |
| `src/components/HubPivot.astro` | 顶 pivot title strip（含 prev/next peek） |
| `src/components/PivotPage.astro` | WP10 Pivot 容器（Dish/Ingredient/Sauce 共用） |
| `src/components/PivotTab.astro` | 单个 pivot tab |
| `src/components/MetroEmptyState.astro` | 404 / 空态 |
| `src/lib/pivotScripts.ts` | PivotPage tab 切换 logic |

### CHANGE
| 文件 | 改动 |
|---|---|
| `BaseLayout.astro` | 收紧 token、metro-nav 改 `data-role="app-bar"`、`<footer>` 默认渲染、Metro CSS 在自定义 CSS 之前 import 用 `:where(:root)` 降权 |
| `Hub.astro` | 瘦身：只做数据拉取 + 组合 panels；tile 全部 inline `data-role="tile"` |
| `[locale]/dishes/[id].astro` | 重写为 PivotPage 4 tab |
| `[locale]/ingredients/[id].astro` | 重写为 PivotPage 2 tab |
| `[locale]/sauces/[id].astro` | 重写为 PivotPage 2 tab |
| `[locale]/search.astro` | 改用 `data-role="listview"` 渲染结果 |
| `404.astro` | 重写为 MetroEmptyState |
| `lib/hubScripts.ts` | 修 handler 引用泄漏；删 CatTile flip logic（Metro 5 接管） |

### DELETE
| 文件 | 理由 |
|---|---|
| `src/components/CatTile.astro` | 被 `data-role="tile" data-effect="switch"` 替代 |
| `src/scripts/probe-flip-forensic.mjs` | 自写 flip 删后无需 |
| `temp-wrap-test.mjs` | 临时调试 |

### 不动
`CategoryIcon.astro`, `Toast.astro`, `Tooltip.astro`, `Accordion.astro`（仅 style 微调），`lib/categoryColors.ts`, `lib/commonsImage.ts`, `lib/categoryOrder.ts`, `lib/motion/*`, `AppListPanel.astro`（仅内部 markup 改用 listview）

## Section 5 — Bundled bug fixes（嵌在 refactor 内）

| # | Bug | 修法 |
|---|---|---|
| B1 | hubScripts.ts:144/148/153 handler 泄漏 | 保存 handler 引用，teardown 全 remove |
| B2 | categoryPhoto 8 缺 7 | `categoryPhoto()` 加 fallback：分类无图 → 该分类第一道 dish 的图；都无 → 全站首张 dish 图；都无 → 实色（warn log） |
| B3 | Hub 缺 footer | BaseLayout `<footer>` 默认渲染；Hub 不要在 `:has(#hub) main` 隐藏 footer |
| B4 | Theme nav 不同步 | 把 `reapplyTheme()` 改为 `<script is:inline>` 紧跟 `<nav>` 之后，确保 SSR 完成时就 sync |
| B5 | 23 处 `as any` | 改用 WeakMap pattern：`const handlers = new WeakMap<Element, HandlerSet>()` |
| B6 | 20+ `!important` | Metro CSS import 顺序移到 BaseLayout style 前；`@import` 包裹 `:where(:root)` 降低权重 |
| B7 | 硬编码字号/字重/颜色绕过 token | grep `font-size: 0\.(7\|72\|78\|85\|875\|9\|9375\|95)rem` / `#fff` / `#1d1d1d` / px 间距，全迁到 var；tokens.test.ts 护栏 |
| B8 | a11y | hub-pivot prev/next 改 `<button>`；Accordion `<label>` 加 `role="button"` + tabindex + keydown handler |
| B9 | dev server 端口不稳 | probe 脚本启动前 port-scan 4321-4329 找有响应的；或读 env `PORT` |

## Section 6 — 验收 / 测试 / 实施顺序

### 验收
- `node site/scripts/probe-final-sweep.mjs`（3 viewport × 3 locale × 10 路由 = 90 截图 + console 错误收集）：**0 console error**，且 dev-server 全程不挂（先修 B9）
- 同 sweep 再跑 `npm run build && npx astro preview` 模式：**0 console error**（捕捉 build-only 的 hydration / pagefind 问题）
- 每页都有同款 nav（status bar）+ 同款 footer（Metro 红条）+ 同款 type 阶梯 + 同款配色
- **无圆角**（除照片本身）+ **无阴影**（除 `.wp-tile.pressing`）
- `npm run test` 仍绿；`tokens.test.ts` 新增护栏绿
- 9 路由 before/after 截图供人工 review

### 新测试
- `src/lib/tokens.test.ts`：scan 所有 `font-size:` / `font-weight:` / `padding:` 值在 token 集合内
- `site/scripts/probe-pivot-tab.mjs`：验证 Dish PivotPage 4 tab swipe + click 都能切

### 实施顺序（writing-plans 的 input）
1. **Token 收紧** — 在 BaseLayout `:root` 增加 7 档字号 / 3 档字重 / 3 档 letter-spacing / 6 档间距 CSS 变量；扫描并删除当前未引用的旧 token（`farewell-*` 等如有）；新增 `src/lib/tokens.test.ts` 护栏 — **0.5 天**
2. **`metro-nav` → `data-role="app-bar"`**（最小风险的 Metro 5 集成验证；同时验证 Open Question 2：Tile `switch` 效果视觉）— **0.5 天**
3. **CatTile → `data-role="tile" data-effect="switch"`** + 删 `hubScripts.ts` 里 `initCatTileCycle` / `teardownCatTileCycle`（hub nav + featured tile logic 保留）— **1 天**
4. **新组件**：HubPivot / PivotPage / PivotTab / MetroEmptyState — **1 天**
5. **Hub.astro 内嵌 panel 重写**：home / 8 category browse panel 的 tile 从自写类改 inline `data-role="tile"` markup — **0.5 天**
6. **Dish detail 重写**为 PivotPage 4 tab — 1.5 天
7. **Ingredient / Sauce / Search / 404 重写** — 1 天
8. **Bundled bug fixes B1-B9** — 0.5 天（很多嵌在前面步骤）
9. **Token migration**（B7 grep-replace） — 0.5 天
10. **回归 sweep + 视觉对比 + commit** — 0.5 天

**总计 ~6.5 工作日**

## Out of scope
- 不动 i18n 内容
- 不动 search algo (pagefind)
- 不动 view transition slide animations（CategoryPivot.astro 的 nav-next/nav-prev 逻辑保留）
- 不新增 dish/ingredient/sauce 数据
- 不优化图片加载（lazy / responsive image 另开 ticket）
- 不动 build 配置 / Astro 升级

## Open Questions / Risks

1. **Dish 4-tab Pivot vs 长滚动 UX**：食谱用户习惯从上到下读"配料→做法→小贴士"，4 tab 切换会打断阅读连贯。设计选择是优先 WP10 视觉一致性。如果实施后用户反馈差，可以 fallback 到"单 PivotPage 长滚动 + Hub-style pivot 顶 strip"。
2. **Metro 5 `data-effect="switch"` vs WP10 翻面**：v5 的 switch 是 X 轴翻面？需要 spike step 验证视觉与原 CatTile 翻面一致；不一致就回退用 `flip-card` 组件或 `slide-up` 效果。
3. **Search "炒" 返回 0 结果**：sweep 测的是 dev 模式无 pagefind。已 npm run build 验证 prod；如果 prod 也不返回，可能是 pagefind CJK tokenization 配置问题。本次不修，但加 audit 笔记。
4. **View transition name 稳定性**：B7 migration 时要保持 `view-transition-name: tile-{cat}` / `dish-{id}` 不变，否则 Continuum tile-to-page morph 会断。回归测试要包含 tile-click → dish-page 的视觉过渡。
5. **Build mode acceptance**：sweep 默认对 dev server。验收追加 `npm run build && astro preview` 模式的 sweep。
6. **Hub URL state vs PivotPage URL state**：Hub 已经用 `history.replaceState` 同步 panel ↔ URL。PivotPage 也要做同样，避免浏览器 back 跳出页面。
