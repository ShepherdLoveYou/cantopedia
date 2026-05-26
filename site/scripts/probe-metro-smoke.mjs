import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT_DIR, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
let dims;
let errors = [];
let ok = true;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/cantopedia/zh/metro-test`, { waitUntil: 'networkidle' });

  dims = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      small: pick('.tile-small'),
      medium: pick('.tile-medium'),
      wide: pick('.tile-wide'),
      large: pick('.tile-large'),
      bodyHasCloak: document.body.classList.contains('m4-cloak'),
      bodyOpacity: getComputedStyle(document.body).opacity,
    };
  });

  await page.screenshot({ path: resolve(OUT_DIR, 'metro-smoke.png'), fullPage: true });
  writeFileSync(resolve(OUT_DIR, 'metro-smoke.json'), JSON.stringify({ dims, errors }, null, 2));
  console.log(JSON.stringify({ dims, errors }, null, 2));

  // Assertions
  const expected = { small: {w:70,h:70}, medium: {w:150,h:150}, wide: {w:310,h:150}, large: {w:310,h:310} };
  for (const [k, v] of Object.entries(expected)) {
    const got = dims[k];
    if (!got || got.w !== v.w || got.h !== v.h) {
      console.error(`FAIL ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got)}`);
      ok = false;
    }
  }
  if (dims.bodyHasCloak) { console.error('FAIL: body has m4-cloak class'); ok = false; }
  if (parseFloat(dims.bodyOpacity) < 1) {
    console.error(`FAIL: body opacity is ${dims.bodyOpacity}, expected 1 (Metro may be hiding via opacity rule)`);
    ok = false;
  }
  if (errors.length) {
    console.error(`FAIL: ${errors.length} console/page errors:`);
    errors.forEach((e, i) => console.error(`  [${i}] ${e}`));
    ok = false;
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
