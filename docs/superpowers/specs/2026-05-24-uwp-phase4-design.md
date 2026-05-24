# UWP Phase 4 — Drawer + Dark Mode + Continuum

**Goal:** Make the whole site (not just the homepage) feel WP10 Mobile, without bloating a reading-heavy cookbook with WP10 features that don't serve it.

**In scope (3 items):**

1. **Hamburger drawer + acrylic blur nav** — replace top-nav locale-only pivot with a WP10 left-drawer pattern, leaving the locale pivot in place.
2. **Dark / Light mode toggle** — authentic WP10 setting, also useful for a cookbook in low-kitchen-light.
3. **Continuum domino page transitions** — staggered children-in / children-out on every navigation, layered on top of existing ClientRouter.

**Explicitly NOT in scope (and why):**

- ❌ Bottom AppBar — duplicates nav, steals reading space on a content site.
- ❌ Accent color picker — fights existing 8-category Metro palette.
- ❌ Wide-tile photo flip — blocked on dish-image pipeline.
- ❌ A-Z jumping grid — blocked on Pagefind init.
- ❌ Resco arrows / ripple / marquee — defer to Phase 5 polish.

---

## 1. Hamburger drawer + acrylic blur nav

**Markup change in `BaseLayout.astro`:**

- New hamburger button on far-left of `.metro-nav`, `aria-controls="nav-drawer" aria-expanded`.
- New `<aside id="nav-drawer">` between nav and main, hidden by default.
- Drawer contents (top-to-bottom):
  - Brand row (粵食典 · Cantopedia)
  - 8 category links: `<CategoryIcon />` 24px + name + count badge
  - Divider
  - Locale switcher (full names: `中文 · 粵語 · English`)
  - Theme toggle row (label + sun/moon button)
  - Footer line: GitHub link

**CSS:**

- Drawer fixed-position left, width clamp(260px, 78vw, 320px), full height, transform translateX(-100%) → 0 when open.
- Background: `rgba(20, 20, 20, 0.72)` + `backdrop-filter: blur(20px) saturate(180%)` — acrylic.
- `.metro-nav` also acrylic: `rgba(29, 29, 29, 0.72)` + same blur.
- Backdrop scrim: `<div class="drawer-scrim">` fixed inset, `background: rgba(0,0,0,0.4)`, fades in.

**JS (in `BaseLayout.astro` script block):**

- Toggle `.open` on `#nav-drawer` and `.drawer-scrim` on hamburger click.
- Close on: scrim click, Esc key, drawer link click, `astro:before-preparation`.
- Focus-trap when open: cycle Tab through drawer's `<a>`/`<button>` elements only.
- ARIA `aria-expanded` sync on hamburger.

**Reduced motion:**

- Drawer instant open/close, no blur fade.

---

## 2. Dark / Light mode toggle

**Approach:** CSS custom properties keyed off `<html data-theme="dark">`. Light is default.

**Theme tokens (added to `:root` in `BaseLayout.astro`):**

```css
:root {
  --t-bg: #f5f5f5;
  --t-plate: #ebebeb;
  --t-ink: #1d1d1d;
  --t-ink-dim: #555;
  --t-rule: #d8d8d8;
  --t-card: #ffffff;
  --t-nav-bg: rgba(29, 29, 29, 0.72);
  --t-nav-ink: #ffffff;
}
html[data-theme="dark"] {
  --t-bg: #0e0e10;
  --t-plate: #1a1a1c;
  --t-ink: #f0f0f0;
  --t-ink-dim: #9a9a9a;
  --t-rule: #2a2a2c;
  --t-card: #161618;
  --t-nav-bg: rgba(10, 10, 12, 0.78);
  --t-nav-ink: #f0f0f0;
}
```

**Apply to existing globals:**

- `body { background: var(--t-bg); color: var(--t-ink); }`
- Replace literal `#fff` / `white` backgrounds on `.progress-section`, plate, etc. with `var(--t-card)` / `var(--t-plate)`.
- Replace `var(--bg)`, `var(--plate)`, `var(--ink)`, `var(--ink-dim)`, `var(--rule)` references → forward to new `--t-*` tokens (keep old names as aliases for back-compat).
- Tile colors (Metro palette `--m-*`) stay the same — they're inherent to categories.

**Toggle UI:**

- Inside the drawer, a row: label (`主題` / `Theme`) + button group `[☀ Light] [🌙 Dark] [💻 Auto]`.
- Default: Auto follows `prefers-color-scheme`.
- Persist in `localStorage.setItem('cantopedia-theme', 'light'|'dark'|'auto')`.
- On boot (inline `<head>` script to avoid FOUC), read the saved choice and set `data-theme` before paint.

**Pre-paint script (inline in `<head>` of BaseLayout):**

```html
<script is:inline>
  (function () {
    const saved = localStorage.getItem('cantopedia-theme') || 'auto';
    const dark = saved === 'dark' || (saved === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themeChoice = saved;
  })();
</script>
```

---

## 3. Continuum domino page transitions

**Goal:** When navigating (e.g. tile click → browse page), the incoming page's top-level children (`<h1>`, `<h2>`, hero, sections, tiles) cascade in with a 40ms stagger, like WP10 hub-page reveals.

**CSS in BaseLayout `<style is:global>`:**

```css
::view-transition-new(root) > * { /* not supported — fallback to per-element below */ }

main > * {
  animation: continuum-in var(--fluent-duration-gentle, 250ms) var(--fluent-curve-decelerate-mid, ease-out) both;
}
main > *:nth-child(1) { animation-delay: 0ms; }
main > *:nth-child(2) { animation-delay: 40ms; }
main > *:nth-child(3) { animation-delay: 80ms; }
main > *:nth-child(4) { animation-delay: 120ms; }
main > *:nth-child(5) { animation-delay: 160ms; }
main > *:nth-child(6) { animation-delay: 200ms; }

@keyframes continuum-in {
  from { transform: translateY(18px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  main > * { animation: none; }
}
```

This fires on every page load AND every ClientRouter navigation (since Astro re-creates `<main>` content). No JS needed.

**Drawer-link click** must close the drawer BEFORE navigation so the cascade isn't visually competing with the drawer slide-out.

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `site/src/layouts/BaseLayout.astro` | Drawer markup + acrylic CSS + theme tokens + Continuum CSS + pre-paint theme script + drawer/theme behavior script |
| Modify | `site/src/pages/[locale]/index.astro` | Update homepage backgrounds (`.progress-section`, hero progress bar) to theme tokens |
| Modify | `site/src/pages/[locale]/browse/[category].astro` | Theme token plumbing if it hardcodes any `#fff` |
| Modify | `site/src/pages/[locale]/dishes/[id].astro` | Same |
| Modify | `docs/HANDOFF.md` | Phase 4 SHIPPED section |

---

## Risks

| Risk | Mitigation |
|---|---|
| `backdrop-filter` not supported on older Android WebView | Fallback to solid `rgba(20,20,20,0.92)` via `@supports not (backdrop-filter: blur(1px))` |
| FOUC of light theme on dark-preferring users | Inline pre-paint script in `<head>` BEFORE the stylesheet, sets `data-theme` synchronously |
| Continuum stagger clashes with existing root cross-fade | Keep root cross-fade short (220ms); stagger total 200ms — they finish around the same time |
| Drawer focus-trap traps screen-reader users on close | Always restore focus to hamburger button on close |
| Dish detail page has its own `<style>` with hardcoded colors | Audit + replace; commit as part of Phase 4 |

---

## Done definition

1. Hamburger drawer opens/closes from every page; contents include 8 category icons + locale + theme toggle.
2. Acrylic blur visible behind nav and drawer (when supported).
3. Theme toggle persists across reloads; pre-paint script prevents FOUC.
4. Every page navigation triggers a staggered children-in cascade.
5. `pnpm build` clean (576 pages), `pnpm test` 5/5, `pnpm check` 0 errors.
6. Production reflects new look on `/zh/`, `/yue/`, `/en/`.
