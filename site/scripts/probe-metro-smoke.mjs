import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:4321/cantopedia/zh/metro-test', { waitUntil: 'networkidle' });

const dims = await page.evaluate(() => {
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

await page.screenshot({ path: 'site/probe-out/metro-smoke.png', fullPage: true });
writeFileSync('site/probe-out/metro-smoke.json', JSON.stringify({ dims, errors }, null, 2));
console.log(JSON.stringify({ dims, errors }, null, 2));

await browser.close();

// Assertions
const expected = { small: {w:70,h:70}, medium: {w:150,h:150}, wide: {w:310,h:150}, large: {w:310,h:310} };
let ok = true;
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
process.exit(ok ? 0 : 1);
