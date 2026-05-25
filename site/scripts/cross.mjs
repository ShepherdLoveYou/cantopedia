// Cross-browser sanity: chromium / firefox / webkit
// Verifies basic rendering + no console errors on each.

import { chromium, firefox, webkit } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const results = {};
for (const [name, runner] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  console.log(`\n=== ${name} ===`);
  const browser = await runner.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  try {
    const resp = await page.goto(BASE + '/zh', { waitUntil: 'networkidle', timeout: 30000 });
    if (!resp || resp.status() >= 400) {
      results[name] = { ok: false, error: `status ${resp?.status()}` };
      console.log('[FAIL]', name, 'status', resp?.status());
      await browser.close();
      continue;
    }
    await page.waitForTimeout(1500);

    const tileCount = await page.locator('.wp-tile').count();
    const heroTitle = await page.locator('.panorama-title').first().textContent();
    const drawerHidden = await page.locator('.nav-drawer').evaluate((el) => el.hasAttribute('inert'));
    const acrylic = await page.locator('.nav-drawer').evaluate((el) => {
      const s = getComputedStyle(el);
      return s.backdropFilter || s.webkitBackdropFilter || 'none';
    });

    // Open drawer to test
    await page.click('#hamburger');
    await page.waitForTimeout(500);
    const drawerOpen = await page.locator('.nav-drawer').evaluate((el) => el.classList.contains('open'));

    results[name] = {
      ok: errors.length === 0 && tileCount >= 6 && drawerOpen && heroTitle?.includes('粵食典'),
      tileCount,
      heroTitle: heroTitle?.slice(0, 30),
      drawerHidden,
      drawerOpen,
      acrylic,
      errors,
    };

    console.log('tile count:', tileCount);
    console.log('hero title:', heroTitle?.slice(0, 30));
    console.log('drawer closed inert:', drawerHidden);
    console.log('drawer opens:', drawerOpen);
    console.log('acrylic supported:', acrylic !== 'none');
    console.log('errors:', errors.length);
    if (errors.length) errors.forEach((e) => console.log('  -', e));
  } catch (e) {
    results[name] = { ok: false, error: e.message };
    console.log('[FAIL]', name, e.message);
  }
  await browser.close();
}

const failed = Object.entries(results).filter(([, r]) => !r.ok);
if (failed.length) {
  console.error('\nFAIL:', failed.map(([n]) => n).join(', '));
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}
console.log('\nALL BROWSERS OK');
