# Handoff: 黑夜模式 bug + tile flip + WP10 refresh

**日期**：2026-05-26
**分支**：`feat/wp10-metroui`
**最近 commit**：`5a01f0a fix: cat-tile flip — animate each slide instead of the parent (Chrome backface bug)`

---

## 1. 本会话刚完成的工作

| Commit | 内容 |
|---|---|
| `5a01f0a` | **cat-tile 翻转修复**：之前父元素 rotateX + 子 backface-visibility 在 Chrome 失效（文字镜像/颠倒可见）。改成每个 slide 自己 animate，front `rotateX(0→-180→-360)`，back `rotateX(180→0→-180)`。文字恢复正向。 |
| `0fc9c3e` | **3D 翻转 + 圆角 reset + per-tile stagger**：7s 周期、stagger via inline `--flip-delay: ${idx * 0.55}s`、全局 `border-radius: 0 !important` 列全所有 tile 类。 |

**Playwright probe 验证**：[site/scripts/probe-flip-truth.mjs](../../site/scripts/probe-flip-truth.mjs) 实测翻转动画在跑（transform matrix 在 7s 周期内按 keyframe 切换、front face 在 backface phase 正确隐藏）。

---

## 2. 进行中：黑夜模式 bug — 用户选了方案 C，未完成

### 探测到的 4 类 bug

[site/scripts/probe-theme-truth.mjs](../../site/scripts/probe-theme-truth.mjs) 跑出来：

| 问题 | 现状 |
|---|---|
| **body 背景不变黑** | `<html>` 切对（`#f5f5f5` ↔ `#0e0e10`），`<body>` 永远白 (`rgb(255,255,255)`) |
| **菜谱页无主题切换控件** | 切换按钮只在 Start Menu 的 utility row，离开首页就没了 |
| **FOUC** | 初次加载 + 主题切换 + ClientRouter nav 都有 |
| **元素不跟主题** | tile bg、nav/footer bg、Ken Burns 区、文字色都不同步 |

### 根因（已诊断）

`BaseLayout.astro:485` 写 `--body-background: var(--t-bg)` 没 `!important`。Metro UI 的 CSS 后加载，它的 `:root { --body-background: var(--default-background) }` (= `#fff`) 同 specificity 后赢。Metro 的 `body { background-color: var(--body-background) }` 因此恒为白。之前 commit `3e4128f` 用 `!important` 修过，被后续重构（tokens.test.ts B7 系列）拿掉了。

### 用户选的方案：**C — 接入 Metro 原生 `.dark-side`**

让 Metro UI 主导主题，我们的 `--t-*` token 退为别名。已 present 完 Section 1 的核心架构，**Section 2-4 还没 present**。

#### Section 1：架构（用户已隐式接受，未明确确认）

`<html>` 上加/去 `.dark-side` 类，Metro v5 自带的 `.dark-side { ... }` CSS 自动重映射所有 `--body-background` / `--body-color` / `--border-color` / `--link-color` 等。

我们在 `BaseLayout.astro` 的 `:root` 做 alias：

```css
:root {
  --t-bg: var(--body-background);
  --t-ink: var(--body-color);
  --t-rule: var(--border-color);
  --t-plate: var(--default-background-disabled);
  --link: var(--link-color);
}
```

所有用 `var(--t-bg)` 的 site 代码（hub-panel、app-list、dish 页）**自动跟随**——0 site 改动。`--m-*` 品牌色（分类红绿蓝橙）**不动**。

#### Section 2-4：还没 present 给用户

需要继续 brainstorm：

**Section 2 — 主题切换 UI 全局化**
- 选项 A：把 light/dark/auto 3 个 1×1 tile 从 Start Menu 移到 BaseLayout 的 `<nav>`（顶部 nav 全局可见）
- 选项 B：右下角浮动小按钮（fixed positioning）
- 选项 C：双重——Start Menu 保留 + nav 也有
- **推荐 B**：fixed bottom-right floating，所有页面一致，不动 nav 结构

**Section 3 — FOUC 三场景修复**
- a) 初次加载：`BaseLayout` 的 `<script is:inline data-astro-rerun>`（已有）扩展为也加 `.dark-side` class，不只 `data-theme` dataset
- b) 主题切换瞬间：CSS 加 `:root { transition: background-color 200ms ease, color 200ms ease }`，或保留无 transition 让切换瞬时
- c) ClientRouter nav 中间帧：监听 `astro:before-swap`，把 `.dark-side` 同步到 incoming document.documentElement

**Section 4 — 硬编码颜色清单**
需要 grep 找出 site 代码里非 var() 的颜色：
```bash
grep -rE "background[^:]*:\s*(#|rgb|white|black)" site/src --include="*.astro" --include="*.css" | grep -v "var(--"
```
逐一改成 `var(--t-bg)` 或 `var(--body-background)` —— 主要嫌疑：Ken Burns 区、`.featured-tile { background: var(--t-plate) }`（已用 token 但需验证 `--t-plate` 在 dark 下值合理）、`html[data-theme="light"] .metro-nav.app-bar` 这种 selector（用 `.dark-side` 后要重写）。

---

## 3. 关键开放问题

1. **`html[data-theme="..."]` selector 还要不要保留？**
   方案 C 用 `.dark-side` class，但代码里现存 `html[data-theme="light"]` / `html[data-theme="dark"]` selector（grep [BaseLayout.astro:545, 582, 622](../../site/src/layouts/BaseLayout.astro)）。决策：保留两套并存（`data-theme` 给 token alias、`.dark-side` 给 Metro）or 全迁 `.dark-side`？

2. **`prefers-reduced-motion` 用户的 auto 模式**
   现在 inline script 用 `matchMedia('(prefers-color-scheme: dark)').matches`。auto 模式下系统改主题应该自动跟随——但 `matchMedia` listener 没装。新设计要加：
   ```js
   matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
   ```

3. **localStorage key 不变**：`cantopedia-theme`（已 grep 确认）。值仍 `light` / `dark` / `auto`。

---

## 4. dev server 状态

会话开始时 4321 上跑的是 production build artifact（HMR 失效）。本会话内：
1. 杀掉 PID 46964 → 启 `pnpm dev` → 又被自动后台清掉
2. 多次重启，最后用 `powershell Start-Process -WindowStyle Hidden` 也没保留
3. 当前**dev server 不确定还在不在跑**，下个会话进来先 `curl -o NUL -w "%{http_code}" http://localhost:4321/cantopedia/zh`，若不是 200 重启：
   ```bash
   cd site && pnpm dev
   ```
   （前台跑，不放后台 — Astro dev 在 detached background 模式下退出）

---

## 5. 用户偏好（memory 已记录）

详见 `~/.claude/projects/d--Cantonese-Cuisine/memory/MEMORY.md`：

- **用中文对话** — [feedback_language.md](../../../memory/feedback_language.md)
- **Playwright probe 是 debug 唯一手段** — [feedback_playwright_debug.md](../../../memory/feedback_playwright_debug.md)：evidence before fixes, 不用手测
- **Figma MCP 用 read-only**（用户是 View 座 seat）— [feedback_figma_mcp.md](../../../memory/feedback_figma_mcp.md)
- **高 autonomy** — [feedback_user_delegation.md](../../../memory/feedback_user_delegation.md)
- **不重新发明轮子** — 用 olton/metroui 等 MIT 库 — [feedback_dont_reinvent_wheel.md](../../../memory/feedback_dont_reinvent_wheel.md)

---

## 6. 下个会话第一步

1. **重启 dev server**（见 §4），verify 4321 在线
2. **重跑 probe-theme-truth.mjs** 确认 4 类 bug 仍复现（外部 commits 可能修了部分）
3. **回到 brainstorming Section 2**：
   - 提问主题切换 UI 全局化位置（推荐右下 fixed）
   - 提问 FOUC 处理细节
   - 提问硬编码颜色清单审计范围
4. brainstorm 完写 spec：`docs/superpowers/specs/2026-05-26-dark-mode-darkside-design.md`
5. spec 通过后用 `writing-plans` 写实施方案，分 4-6 commit

---

## 7. 关键文件位置

| 文件 | 角色 |
|---|---|
| [site/src/layouts/BaseLayout.astro](../../site/src/layouts/BaseLayout.astro) | theme inline script (lines 50-64, 114-126), `:root` token block (285+), nav/footer selectors (540+) |
| [site/src/components/Hub.astro](../../site/src/components/Hub.astro) | Start Menu utility theme tiles (lines 242-256), cat-tile flip CSS (599-650) |
| [site/src/components/CatTile.astro](../../site/src/components/CatTile.astro) | **已废弃** — markup 在 Hub.astro 内联（`.cat-tile-v5`） |
| [site/scripts/probe-theme-truth.mjs](../../site/scripts/probe-theme-truth.mjs) | 主题 bug 诊断 probe |
| [site/scripts/probe-flip-truth.mjs](../../site/scripts/probe-flip-truth.mjs) | 翻转 bug 诊断 probe |
| [site/node_modules/@olton/metroui/lib/metro.css](../../site/node_modules/@olton/metroui/lib/metro.css) | Metro v5 source — grep `.dark-side` 看暗模式 token 定义 |
