import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const SELECTORS = [
    '.metro-nav',
    '.metro-nav .brand-name',
    '.metro-nav .pivot-tab',
    '.metro-nav .pivot-tab.active',
    'footer',
    'main',
    '.loading-bar',
  ];

  async function capture(url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    return await page.evaluate((selectors) => {
      const out = {};
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) { out[sel] = null; continue; }
        const cs = getComputedStyle(el);
        out[sel] = {
          display: cs.display,
          position: cs.position,
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          fontFamily: cs.fontFamily.slice(0, 40),
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          height: cs.height,
          padding: cs.padding,
          margin: cs.margin,
        };
      }
      return out;
    }, SELECTORS);
  }

  const hub = await capture(`http://localhost:${PORT}/cantopedia/zh`);
  // First real dish ID in the data collection
  const dish = await capture(`http://localhost:${PORT}/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2`);

  // Diff: for each selector, list properties that differ
  const diff = {};
  for (const sel of SELECTORS) {
    const h = hub[sel] ?? {};
    const d = dish[sel] ?? {};
    const keys = new Set([...Object.keys(h), ...Object.keys(d)]);
    const props = {};
    for (const k of keys) {
      if (h[k] !== d[k]) props[k] = { hub: h[k], dish: d[k] };
    }
    if (Object.keys(props).length > 0) diff[sel] = props;
  }

  writeFileSync(resolve(OUT, 'css-leak.json'), JSON.stringify(diff, null, 2));
  console.log(JSON.stringify(diff, null, 2));
} finally {
  await browser.close();
}
process.exit(0);
