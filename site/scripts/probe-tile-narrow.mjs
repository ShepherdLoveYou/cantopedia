import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const BASE = `http://localhost:${process.env.PORT || '4321'}/cantopedia`;

const widths = [320, 360, 375, 390, 414, 428];

const browser = await chromium.launch();
try {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      try { localStorage.setItem('cantopedia-theme', 'dark'); } catch (e) {}
      document.documentElement.classList.add('dark-side');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const d = await page.evaluate(() => {
      const grid = document.querySelector('.tiles-grid');
      const tiles = [...document.querySelectorAll('.tiles-grid > a')];
      const lastTile = tiles[tiles.length - 1] ?? null;
      const gr = grid?.getBoundingClientRect();
      const main = document.querySelector('main');
      const mr = main?.getBoundingClientRect();
      // Rightmost tile pixel
      const rightmost = Math.max(...tiles.map((t) => t.getBoundingClientRect().right));
      return {
        viewportW: window.innerWidth,
        mainW: mr ? Math.round(mr.width) : null,
        mainPaddingLeft: main ? getComputedStyle(main).paddingLeft : null,
        mainPaddingRight: main ? getComputedStyle(main).paddingRight : null,
        gridX: gr ? Math.round(gr.x) : null,
        gridW: gr ? Math.round(gr.width) : null,
        rightmostTile: Math.round(rightmost),
        overflowRight: Math.round(rightmost - window.innerWidth),
        leftGutter: gr ? Math.round(gr.x) : null,
        rightGutter: gr ? Math.round(window.innerWidth - gr.x - gr.width) : null,
      };
    });
    await page.screenshot({ path: resolve(OUT, `narrow-${w}.png`), fullPage: false });
    console.log(`vw=${w.toString().padStart(3)}  main=${d.mainW}  grid x=${d.gridX} w=${d.gridW}  right-tile=${d.rightmostTile}  overflow-right=${d.overflowRight}  L=${d.leftGutter}  R=${d.rightGutter}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
