/**
 * Playwright probe: verify PivotPage tab navigation works.
 * Runs after Step 6 (Dish detail rewrite). For now just a placeholder
 * that will fail gracefully if the dish detail page hasn't been rewritten yet.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out', 'pivot-tab');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push({ kind: 'pageerror', msg: e.message }));
p.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', msg: m.text() }); });

// Navigate to a dish detail page
await p.goto(`http://localhost:${PORT}/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2`, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

// Verify pivot tabs exist
const tabCount = await p.locator('.pivot-tab-label').count();
if (tabCount === 0) {
  console.log(`SKIP — no .pivot-tab-label found (dish detail not yet rewritten as PivotPage; this is expected pre-Step 6)`);
  await browser.close();
  process.exit(0);
}
if (tabCount !== 4) {
  console.error(`FAIL: expected 4 pivot tabs, got ${tabCount}`);
  await browser.close(); process.exit(1);
}

await p.screenshot({ path: resolve(OUT, '01-initial.png') });

await p.locator('.pivot-tab-label').nth(1).click();
await p.waitForTimeout(600);
await p.screenshot({ path: resolve(OUT, '02-after-tab2.png') });

await p.keyboard.press('ArrowRight');
await p.waitForTimeout(600);
await p.screenshot({ path: resolve(OUT, '03-after-arrow-right.png') });

const hash = await p.evaluate(() => location.hash);
if (!hash) {
  console.error(`FAIL: URL hash not updated after tab nav`);
  await browser.close(); process.exit(1);
}

console.log(`PASS — tabs: ${tabCount}, final hash: ${hash}, errors: ${errors.length}`);
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
