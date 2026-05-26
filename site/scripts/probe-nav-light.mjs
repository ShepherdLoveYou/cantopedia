import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const URL = `http://localhost:${PORT}/cantopedia/zh`;

const widths = [
  { name: 'mobile-414', w: 414, h: 896 },
  { name: 'tablet-768', w: 768, h: 1024 },
  { name: 'desktop-1280', w: 1280, h: 800 },
];

const browser = await chromium.launch();
const results = [];
try {
  for (const v of widths) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark-side');
      try { localStorage.setItem('cantopedia-theme', 'light'); } catch (e) {}
    });
    await page.waitForTimeout(200);

    const diag = await page.evaluate(() => {
      const nav = document.querySelector('.metro-nav.app-bar');
      const hamCount = document.querySelectorAll('.metro-nav .hamburger').length;
      const dropdownCount = document.querySelectorAll('.metro-nav .app-bar-menu').length;
      const switcher = document.querySelector('.metro-nav .locale-switcher');
      const tabs = [...document.querySelectorAll('.metro-nav .pivot-tab')].map((a) => {
        const cs = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        return {
          text: a.textContent?.trim(),
          loc: a.getAttribute('data-loc'),
          active: a.classList.contains('active'),
          opacity: cs.opacity,
          color: cs.color,
          visible: r.width > 0 && r.height > 0,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        };
      });
      const moreBtn = document.querySelector('[data-appbar="more"]');
      const themeBtn = document.querySelector('[data-theme-toggle]');
      return {
        viewportW: window.innerWidth,
        navClasses: nav?.className,
        hamCount,
        dropdownCount,
        switcherVisible: switcher ? getComputedStyle(switcher).display !== 'none' : null,
        tabs,
        moreBtnVisible: moreBtn ? getComputedStyle(moreBtn).display !== 'none' : null,
        themeBtnVisible: themeBtn ? getComputedStyle(themeBtn).display !== 'none' : null,
      };
    });
    results.push({ ...v, ...diag });

    await page.screenshot({ path: resolve(OUT, `nav-fix-${v.name}.png`), clip: { x: 0, y: 0, width: v.w, height: 80 } });
    await ctx.close();
  }
  writeFileSync(resolve(OUT, 'nav-fix.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
