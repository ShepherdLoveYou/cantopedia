# 粵食典 · Cantopedia

> 一份基於六張港式茶餐廳菜單水牌、覆蓋 66 道菜、三語呈現、每項皆可溯源的開源粵菜典籍。

English README → [`README.md`](./README.md)

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE-CODE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](./LICENSE-CONTENT)
[![Status](https://img.shields.io/badge/status-v0.1--alpha-orange.svg)](./CHANGELOG.md)

---

## 這是甚麼

一本基於真實港式茶餐廳菜單（六張水牌、共 66 道）整理出的**結構化三語食典**。
每道菜都會以三種語言並陳：

- **粵語本字 + 粵拼**：在香港如何叫、如何讀
- **普通話**：照顧內地讀者
- **English**：照顧海外華裔與感興趣的外國讀者

做法、歷史、設備、過敏原、海外採購建議，全部來自版權清白的來源
（Wikipedia、Wikimedia Commons、USDA、香港政府術語庫、CC 協議的博客）。
每一條陳述都會附引用，回溯到原始來源。

## 這不是甚麼

- 不是又一個食譜博客。我們不會再貼一份別人有版權的食譜。
- 不是某本英文菜譜的中文翻譯。
- 不是 AI 灌水。每個做法都會經過人工 review 才會離開「draft」狀態。

## 快速上手

```bash
# 線上瀏覽
open https://shepherdloveyou.github.io/cantopedia

# 本地跑
git clone https://github.com/ShepherdLoveYou/cantopedia.git
cd cantopedia/site
pnpm install
pnpm dev
```

## 倉庫結構

```
data/             ★ 真正的資產 — YAML 食譜、醬料、食材、引用源
pipeline/         Python 研究流水線（conda env: cantopedia）
site/             Astro 5 靜態站，內建 i18n + Pagefind 搜索
raw_materials/    六張原始菜單照（CC BY-SA 4.0）
scripts/          零碎工具（HEIC 轉換等）
docs/             設計文檔
```

## 雙協議授權

本項目採用業內慣例的**雙協議**：

| 內容 | 協議 | 文件 |
|------|---------|------|
| **代碼**（流水線、站點源碼、腳本、workflow） | MIT | [`LICENSE-CODE`](./LICENSE-CODE) |
| **內容**（食譜、食材、醬料、原創插圖、菜單照） | CC BY-SA 4.0 | [`LICENSE-CONTENT`](./LICENSE-CONTENT) |
| **第三方圖**（Wikimedia / Unsplash / Pexels / AI 生成） | 逐圖標註 | 在每道菜的 YAML 中 |

如果你 fork 或基於本項目創作：
- 請保留雙協議結構
- 請保留逐圖的引用與授權
- 請在上游引用本倉庫

## 貢獻

社區貢獻流程將於 **v0.2** 開放。在此之前，如果你發現事實錯誤、糟糕的翻譯
或版權問題，歡迎開 issue，我們會處理。

## 鳴謝

- 那位手寫六張水牌、66 道菜的茶餐廳師傅
- Wikimedia Commons 上提供版權清白食物攝影的貢獻者
- 香港政府的[餐飲業中英對照術語庫](https://www.edb.gov.hk/)
- USDA FoodData Central 提供食材營養數據

## 狀態

**v0.1-alpha** — 初始骨架完成；66 道菜全部入庫為 `stub`；1 道示範菜完整；
站點已部署至 GitHub Pages。完整設計請見
[`docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md`](./docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md)。
