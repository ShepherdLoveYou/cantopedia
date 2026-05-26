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
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });  // iPhone-ish
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const bar = document.querySelector('.app-bar--bottom');
    const buttons = Array.from(document.querySelectorAll('[data-appbar]'));
    if (!bar) return { error: 'no AppBar' };
    const cs = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    return {
      barExists: true,
      height: rect.height,
      bottom: window.innerHeight - rect.bottom,
      position: cs.position,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      buttonCount: buttons.length,
      buttonSlots: buttons.map((b) => b.getAttribute('data-appbar')),
      buttonLabels: buttons.map((b) => b.getAttribute('aria-label')),
      hasWpTileClass: buttons.every((b) => b.classList.contains('wp-tile')),
      circleBorder: getComputedStyle(buttons[0]).borderRadius,
    };
  });

  await page.screenshot({ path: resolve(OUT, 'appbar-acrylic.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'appbar-acrylic.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (!data.barExists) { console.error('FAIL: AppBar element not found'); ok = false; }
  if (Math.round(data.height) !== 72) { console.error(`FAIL: AppBar height expected 72, got ${data.height}`); ok = false; }
  if (Math.round(data.bottom) !== 0) { console.error(`FAIL: AppBar bottom offset expected 0, got ${data.bottom}`); ok = false; }
  if (data.position !== 'fixed') { console.error(`FAIL: AppBar position expected 'fixed', got '${data.position}'`); ok = false; }
  if (data.buttonCount !== 4) { console.error(`FAIL: expected 4 buttons, got ${data.buttonCount}`); ok = false; }
  const expectedSlots = ['home', 'search', 'random', 'more'];
  if (JSON.stringify(data.buttonSlots) !== JSON.stringify(expectedSlots)) {
    console.error(`FAIL: expected slots ${expectedSlots}, got ${data.buttonSlots}`);
    ok = false;
  }
  if (!data.hasWpTileClass) { console.error('FAIL: AppBar buttons missing wp-tile class (tilt-press won\'t work)'); ok = false; }
  if (data.buttonLabels.some((l) => !l)) { console.error(`FAIL: some buttons missing aria-label: ${data.buttonLabels}`); ok = false; }
  // backdrop-filter may be 'none' on Firefox; spec says fallback is OK there.
  // Chromium should show 'blur(30px) saturate(125%)' or similar.
  if (!data.backdropFilter || data.backdropFilter === 'none') {
    console.warn(`WARN: backdrop-filter is '${data.backdropFilter}'. Acceptable only on browsers without support.`);
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
