import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const BASE = 'https://shepherdloveyou.github.io/cantopedia';

function pairwiseOverlap(rects) {
  let worst = null;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i], B = rects[j];
      const overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (overlapX > 0.5 && overlapY > 0.5) {
        const area = Math.round(overlapX * overlapY);
        if (!worst || area > worst.area) worst = { area, a: A.idx, b: B.idx, overlapX: Math.round(overlapX), overlapY: Math.round(overlapY) };
      }
    }
  }
  return worst;
}

const cases = [
  { url: `${BASE}/zh?_=${Date.now()}`,                  page: 'home-zh',         w: 414 },
  { url: `${BASE}/zh?_=${Date.now()}`,                  page: 'home-zh',         w: 1280 },
  { url: `${BASE}/zh/browse/appetizer?_=${Date.now()}`, page: 'browse-app',      w: 414 },
  { url: `${BASE}/zh/browse/main?_=${Date.now()}`,      page: 'browse-main',     w: 1280 },
];

const browser = await chromium.launch();
const results = [];
try {
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 896 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(c.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      try { localStorage.setItem('cantopedia-theme', 'light'); } catch (e) {}
      document.documentElement.classList.remove('dark-side');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const data = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.tiles-grid > a')];
      const grid = document.querySelector('.tiles-grid');
      return {
        gridRows: grid ? getComputedStyle(grid).gridTemplateRows : null,
        tileUnit: getComputedStyle(document.documentElement).getPropertyValue('--tile-unit').trim(),
        rects: tiles.map((el, idx) => {
          const b = el.getBoundingClientRect();
          return { idx, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
        }),
      };
    });

    const overlap = pairwiseOverlap(data.rects);
    await page.screenshot({ path: resolve(OUT, `prod-overlap-${c.page}-${c.w}.png`), fullPage: false });
    results.push({ ...c, ...data, overlap });
    await ctx.close();
  }

  writeFileSync(resolve(OUT, 'prod-tile-overlap.json'), JSON.stringify(results, null, 2));

  console.log('--- PROD TILE OVERLAP (commit d4f1a40) ---');
  for (const r of results) {
    const status = !r.overlap ? 'no overlaps ✓' : `OVERLAP ${r.overlap.overlapX}×${r.overlap.overlapY}px ✗`;
    const rows = r.gridRows?.split(' ') ?? [];
    const uniq = [...new Set(rows)];
    const rowsStatus = uniq.length === 1 ? `rows uniform ${uniq[0]} ✓` : `rows mixed ${uniq.slice(0,4).join(',')} ✗`;
    console.log(`  ${r.page}-${r.w}  tiles=${r.rects.length}  unit=${r.tileUnit}  ${rowsStatus}  ${status}`);
  }
} finally {
  await browser.close();
}
