import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 375,  height: 667 },
];

const browser = await chromium.launch();
let ok = true;
try {
  const results = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

    const data = await page.evaluate(() => {
      function pick(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      }
      const tileUnit = getComputedStyle(document.documentElement).getPropertyValue('--tile-unit').trim();
      const tileGap = getComputedStyle(document.documentElement).getPropertyValue('--tile-gap').trim();
      // Sample one of each size
      return {
        tileUnit, tileGap,
        small: pick('.tile-small'),
        medium: pick('.tile-medium'),
        '2x1': pick('.tile-2x1'),
        featured: pick('#featured-tile'),
        // Count classes used in start-tiles
        counts: {
          small: document.querySelectorAll('.start-tiles .tile-small').length,
          medium: document.querySelectorAll('.start-tiles .tile-medium').length,
          '2x1': document.querySelectorAll('.start-tiles .tile-2x1').length,
          wide: document.querySelectorAll('.start-tiles .tile-wide').length,  // should be 0
          large: document.querySelectorAll('.start-tiles .tile-large').length, // should be 0
        },
      };
    });
    results[vp.name] = data;
    await page.screenshot({ path: resolve(OUT, `tile-sizes-${vp.name}.png`), fullPage: true });
    await ctx.close();
  }

  writeFileSync(resolve(OUT, 'tile-sizes.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  // Assertions
  for (const vp of VIEWPORTS) {
    const d = results[vp.name];
    if (d.counts.wide > 0 || d.counts.large > 0) {
      console.error(`FAIL ${vp.name}: still has tile-wide (${d.counts.wide}) or tile-large (${d.counts.large}) — should be 0`);
      ok = false;
    }
    if (d.counts['2x1'] === 0 && d.counts.medium === 0) {
      console.error(`FAIL ${vp.name}: no 2x1 or medium tiles found on Start Menu`);
      ok = false;
    }
    // Verify 2x1 dimensions: width should be ~2 * unit + gap, height should be ~unit
    if (d['2x1']) {
      const unit = parseInt(d.tileUnit);
      const gap = parseInt(d.tileGap);
      const expectedW = 2 * unit + gap;
      if (Math.abs(d['2x1'].w - expectedW) > 2) {
        console.error(`FAIL ${vp.name}: 2x1 width ${d['2x1'].w} != expected ${expectedW}`);
        ok = false;
      }
      if (Math.abs(d['2x1'].h - unit) > 2) {
        console.error(`FAIL ${vp.name}: 2x1 height ${d['2x1'].h} != expected ${unit}`);
        ok = false;
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
