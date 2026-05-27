import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const URL = 'https://shepherdloveyou.github.io/cantopedia/zh';
const widths = [320, 360, 375, 390, 414, 428];

const browser = await chromium.launch();
try {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL + '?_=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      try { localStorage.setItem('cantopedia-theme', 'dark'); } catch (e) {}
      document.documentElement.classList.add('dark-side');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const d = await page.evaluate(() => {
      const grid = document.querySelector('.tiles-grid.start-tiles');
      const gr = grid?.getBoundingClientRect();
      return {
        unit: getComputedStyle(document.documentElement).getPropertyValue('--tile-unit').trim(),
        gridX: gr ? Math.round(gr.x) : null,
        gridW: gr ? Math.round(gr.width) : null,
        L: gr ? Math.round(gr.x) : null,
        R: gr ? Math.round(window.innerWidth - gr.x - gr.width) : null,
      };
    });
    await page.screenshot({ path: resolve(OUT, `prod-narrow-${w}.png`), fullPage: false });
    const fit = d.R >= 0 ? '✓' : `OVERFLOW ${-d.R}px ✗`;
    console.log(`vw=${String(w).padStart(3)}  unit=${d.unit}  grid.w=${d.gridW}  L=${d.L}  R=${d.R}  ${fit}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
