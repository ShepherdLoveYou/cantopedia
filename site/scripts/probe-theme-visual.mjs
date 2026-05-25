import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

async function snap(page, label) {
  await page.screenshot({ path: resolve(OUT, `theme-visual-${label}.png`), fullPage: false });
  return await page.evaluate(() => {
    const css = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, fg: cs.color };
    };
    const html = document.documentElement;
    return {
      dataTheme: html.dataset.theme,
      dataChoice: html.dataset.themeChoice,
      localStorage: localStorage.getItem('cantopedia-theme'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      htmlBg: getComputedStyle(html).backgroundColor,
      mainBg: css('main')?.bg,
      navBg: css('.metro-nav')?.bg,
      catTileSolid: css('.cat-tile .cat-face--solid')?.bg,
      appListBg: css('.hub-panel--applist')?.bg,
      mediaPrefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      ariaPressedLight: document.querySelector('[data-theme-choice="light"]')?.getAttribute('aria-pressed'),
      ariaPressedDark: document.querySelector('[data-theme-choice="dark"]')?.getAttribute('aria-pressed'),
      ariaPressedAuto: document.querySelector('[data-theme-choice="auto"]')?.getAttribute('aria-pressed'),
    };
  });
}

const browser = await chromium.launch();
try {
  const results = {};

  // Pass 1: home page, no localStorage — observe initial state
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });
    results.initial = await snap(page, '1-initial');

    await page.click('[data-theme-choice="dark"]');
    await page.waitForTimeout(500);
    results.afterClickDark = await snap(page, '2-after-dark');

    await page.click('[data-theme-choice="light"]');
    await page.waitForTimeout(500);
    results.afterClickLight = await snap(page, '3-after-light');

    await page.click('[data-theme-choice="auto"]');
    await page.waitForTimeout(500);
    results.afterClickAuto = await snap(page, '4-after-auto');

    await ctx.close();
  }

  // Pass 2: dish page (non-Hub) — does theme apply there?
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });
    await page.click('[data-theme-choice="dark"]');
    await page.waitForTimeout(300);
    const homeDark = await snap(page, '5-home-dark');
    // Navigate to a dish page via in-page link
    const dishLink = await page.$('a[href*="/dishes/"]');
    if (dishLink) {
      await dishLink.click();
      await page.waitForLoadState('networkidle');
    }
    results.dishAfterDark = await snap(page, '6-dish-after-dark');
    await ctx.close();
  }

  // Pass 3: AppList page — does theme apply there?
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/cantopedia/zh/all`, { waitUntil: 'networkidle' });
    results.appListInitial = await snap(page, '7-applist-initial');

    await page.click('[data-theme-choice="dark"]');
    await page.waitForTimeout(500);
    results.appListAfterDark = await snap(page, '8-applist-after-dark');
    await ctx.close();
  }

  writeFileSync(resolve(OUT, 'theme-visual.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
