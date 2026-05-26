import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const BASE = `http://localhost:${PORT}/cantopedia`;

function pairwiseOverlap(rects) {
  // Returns the worst overlap (most negative gap) between any two rectangles.
  let worst = { gap: Infinity, a: null, b: null };
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i], B = rects[j];
      // Compute overlap area sign: positive means overlap, 0 means touch, negative means gap.
      const overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (overlapX > 0.5 && overlapY > 0.5) {
        // True 2D overlap.
        const overlapArea = Math.round(overlapX * overlapY);
        if (-overlapArea < worst.gap) worst = { gap: -overlapArea, a: A.idx, b: B.idx, overlapX: Math.round(overlapX), overlapY: Math.round(overlapY) };
      }
    }
  }
  return worst.gap === Infinity ? null : worst;
}

const browser = await chromium.launch();
const cases = [
  { url: `${BASE}/zh`,                   page: 'home-zh',      w: 414 },
  { url: `${BASE}/zh`,                   page: 'home-zh',      w: 768 },
  { url: `${BASE}/zh`,                   page: 'home-zh',      w: 1280 },
  { url: `${BASE}/zh/browse/appetizer`,  page: 'browse-app',   w: 414 },
  { url: `${BASE}/zh/browse/main`,       page: 'browse-main',  w: 1280 },
  { url: `${BASE}/en/all`,               page: 'all-en',       w: 414 },
];
const results = [];
try {
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 896 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push({ kind: 'pageerror', msg: e.message }));
    await page.goto(c.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark-side');
      try { localStorage.setItem('cantopedia-theme', 'light'); } catch (e) {}
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const data = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.tiles-grid > a')];
      const r = tiles.map((el, idx) => {
        const b = el.getBoundingClientRect();
        return {
          idx,
          cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter((s) => s.startsWith('tile-')).join(' '),
          x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
        };
      });
      const grid = document.querySelector('.tiles-grid');
      return {
        gridRows: grid ? getComputedStyle(grid).gridTemplateRows : null,
        gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
        tileUnit: getComputedStyle(document.documentElement).getPropertyValue('--tile-unit').trim(),
        tileGap: getComputedStyle(document.documentElement).getPropertyValue('--tile-gap').trim(),
        rects: r,
      };
    });

    const overlap = pairwiseOverlap(data.rects);
    await page.screenshot({ path: resolve(OUT, `overlap-${c.page}-${c.w}.png`), fullPage: false });
    results.push({ ...c, ...data, overlap, errors: errs });
    await ctx.close();
  }

  writeFileSync(resolve(OUT, 'tile-overlap-suite.json'), JSON.stringify(results, null, 2));

  console.log('--- TILE OVERLAP SUITE ---');
  for (const r of results) {
    const status = r.overlap === null ? 'no overlaps ✓' : `OVERLAP ${r.overlap.overlapX}×${r.overlap.overlapY}px between tile[${r.overlap.a}] and tile[${r.overlap.b}] ✗`;
    console.log(`  ${r.page}-${r.w}  tiles=${r.rects.length}  unit=${r.tileUnit}  ${status}`);
  }
  // Also report row uniformity.
  console.log();
  for (const r of results) {
    const rows = r.gridRows?.split(' ') ?? [];
    const uniq = [...new Set(rows)];
    console.log(`  ${r.page}-${r.w}  grid rows: ${uniq.length === 1 ? `all ${uniq[0]} ✓` : `mixed ${uniq.slice(0, 4).join(',')}... ✗`}`);
  }
} finally {
  await browser.close();
}
