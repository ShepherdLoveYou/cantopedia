import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const URL = 'https://shepherdloveyou.github.io/cantopedia/zh';

const browser = await chromium.launch();
try {
  // ---- DARK mode probe ----
  for (const mode of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL + '?_=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate((m) => {
      try { localStorage.setItem('cantopedia-theme', m); } catch (e) {}
      document.documentElement.classList.toggle('dark-side', m === 'dark');
    }, mode);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const diag = await page.evaluate(() => {
      function pick(el, label) {
        if (!el) return { label, present: false };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          label,
          present: true,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          color: cs.color,
          bg: cs.backgroundColor,
          opacity: cs.opacity,
          text: el.textContent?.trim()?.slice(0, 30),
        };
      }
      const nav = document.querySelector('.metro-nav.app-bar');
      const tabs = [...nav?.querySelectorAll('.pivot-tab') ?? []];
      return {
        isDark: document.documentElement.classList.contains('dark-side'),
        navBgVar: getComputedStyle(document.documentElement).getPropertyValue('--nav-bg').trim(),
        navFgVar: getComputedStyle(document.documentElement).getPropertyValue('--nav-fg').trim(),
        nav: pick(nav, 'nav'),
        brandName: pick(nav?.querySelector('.brand-name'), 'brand-name'),
        themeBtn: pick(nav?.querySelector('[data-theme-toggle]'), 'theme-btn'),
        moreBtn: pick(nav?.querySelector('[data-appbar="more"]'), 'more-btn'),
        tabActive: pick(nav?.querySelector('.pivot-tab.active'), 'tab-active'),
      };
    });

    await page.screenshot({ path: resolve(OUT, `prod-${mode}-nav.png`), clip: { x: 0, y: 0, width: 414, height: 50 } });
    writeFileSync(resolve(OUT, `prod-${mode}-diag.json`), JSON.stringify(diag, null, 2));
    console.log(`---- ${mode.toUpperCase()} ----`);
    console.log(JSON.stringify(diag, null, 2));
    await ctx.close();
  }
} finally {
  await browser.close();
}
