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

  // 1. Tap the More button.
  await page.locator('[data-appbar="more"]').click();
  // Motion One open animation: 280ms. Wait for finish.
  await page.waitForTimeout(400);

  const afterOpen = await page.evaluate(() => {
    const menu = document.getElementById('appbar-more-menu');
    const trigger = document.querySelector('[data-appbar="more"]');
    return {
      ariaHidden: menu?.getAttribute('aria-hidden'),
      triggerExpanded: trigger?.getAttribute('aria-expanded'),
      transform: menu ? getComputedStyle(menu).transform : null,
      hasThemeTiles: !!menu?.querySelector('button[data-theme]'),
      hasAccentSwatches: !!menu?.querySelector('button[data-accent-swatch]'),
      hasLocalePivot: !!menu?.querySelector('.locale-pivot'),
    };
  });

  // 2. Click a different accent swatch (red).
  await page.locator('[data-accent-swatch="red"]').click();
  await page.waitForTimeout(50);

  const afterAccent = await page.evaluate(() => ({
    dataAccent: document.documentElement.getAttribute('data-accent'),
    storedAccent: localStorage.getItem('cantopedia-accent'),
    pressedSwatch: document.querySelector('button[data-accent-swatch][aria-pressed="true"]')?.getAttribute('data-accent-swatch'),
    accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));

  // 3. Press Escape to close.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const afterClose = await page.evaluate(() => {
    const menu = document.getElementById('appbar-more-menu');
    return {
      ariaHidden: menu?.getAttribute('aria-hidden'),
      transform: menu ? getComputedStyle(menu).transform : null,
    };
  });

  const data = { afterOpen, afterAccent, afterClose };
  await page.screenshot({ path: resolve(OUT, 'more-menu.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'more-menu.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (afterOpen.ariaHidden !== 'false') { console.error(`FAIL: menu still aria-hidden after open: ${afterOpen.ariaHidden}`); ok = false; }
  if (afterOpen.triggerExpanded !== 'true') { console.error(`FAIL: trigger aria-expanded not true: ${afterOpen.triggerExpanded}`); ok = false; }
  if (!afterOpen.hasThemeTiles) { console.error('FAIL: theme tiles missing in menu'); ok = false; }
  if (!afterOpen.hasAccentSwatches) { console.error('FAIL: accent swatches missing in menu'); ok = false; }
  if (afterAccent.dataAccent !== 'red') { console.error(`FAIL: data-accent after red click: ${afterAccent.dataAccent}`); ok = false; }
  if (afterAccent.storedAccent !== 'red') { console.error(`FAIL: localStorage cantopedia-accent: ${afterAccent.storedAccent}`); ok = false; }
  if (afterAccent.pressedSwatch !== 'red') { console.error(`FAIL: pressed swatch should be red: ${afterAccent.pressedSwatch}`); ok = false; }
  if (afterAccent.accentVar !== '#E51400') { console.error(`FAIL: --accent after red: ${afterAccent.accentVar}`); ok = false; }
  if (afterClose.ariaHidden !== 'true') { console.error(`FAIL: menu still open after Escape: ${afterClose.ariaHidden}`); ok = false; }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
