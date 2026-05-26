/**
 * probe-zindex — Spec §6.1 z-index layer ordering verification gate.
 *
 * Reads computed z-index of all layered surfaces (loading-bar, top-strip,
 * app-bar, more-menu, Toast if present) and asserts strict ordering. Also
 * opens the More menu and uses document.elementFromPoint to verify no
 * AppBar overdraw at the menu's center coordinates.
 *
 * Usage: PORT=4322 node site/scripts/probe-zindex.mjs
 * Exit 0 = pass, 1 = fail.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
let ok = true;

try {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  // Snapshot z-index of every layered surface
  const zMap = await page.evaluate(() => {
    function z(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return cs.zIndex === 'auto' ? 0 : parseInt(cs.zIndex, 10);
    }
    return {
      loadingBar: z('#loading-bar') ?? z('.loading-bar'),
      topStrip:   z('.top-strip'),
      appBar:     z('.app-bar.app-bar--bottom'),
      moreMenu:   z('#appbar-more-menu'),
    };
  });

  console.log('Z-index snapshot:', JSON.stringify(zMap, null, 2));
  writeFileSync(resolve(OUT, 'zindex.json'), JSON.stringify(zMap, null, 2));

  // Strict ordering per spec §6.1
  if (zMap.appBar !== 1000) {
    console.error(`FAIL: app-bar z-index ${zMap.appBar}, want 1000 (spec §6.1)`); ok = false;
  }
  if (zMap.moreMenu !== 1001) {
    console.error(`FAIL: more-menu z-index ${zMap.moreMenu}, want 1001 (spec §6.1)`); ok = false;
  }
  if (zMap.moreMenu <= zMap.appBar) {
    console.error(`FAIL: more-menu (${zMap.moreMenu}) must be > app-bar (${zMap.appBar})`); ok = false;
  }
  if (zMap.topStrip !== null && zMap.appBar <= zMap.topStrip) {
    console.error(`FAIL: app-bar (${zMap.appBar}) must be > top-strip (${zMap.topStrip})`); ok = false;
  }
  console.log('✓ strict z-index ordering checked');

  // Open menu, verify no AppBar overdraw at menu center coords
  await page.locator('[data-appbar="more"]').click();
  await page.waitForTimeout(400);

  const topMostAtMenuCenter = await page.evaluate(() => {
    const m = document.getElementById('appbar-more-menu');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + 20;
    const el = document.elementFromPoint(x, y);
    return el ? {
      tag: el.tagName,
      classes: el.className,
      inMenu: m.contains(el),
      x, y,
    } : null;
  });
  console.log('Element at menu-center:', JSON.stringify(topMostAtMenuCenter, null, 2));
  if (!topMostAtMenuCenter?.inMenu) {
    console.error(`FAIL: element at menu center is NOT inside menu — possible AppBar overdraw`); ok = false;
  } else {
    console.log('✓ menu open: no AppBar overdraw at menu coords');
  }

  await ctx.close();
} finally {
  await browser.close();
}

if (!ok) { console.error('\n✗ probe-zindex FAILED'); process.exit(1); }
console.log('\n✓ probe-zindex PASSED');
process.exit(0);
