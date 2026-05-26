import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const BASE = `http://localhost:${PORT}/cantopedia`;

const browser = await chromium.launch();
const log = [];
const errors = [];

async function snapNav(page, label) {
  const d = await page.evaluate(() => {
    const nav = document.querySelector('.metro-nav.app-bar');
    const tabs = [...document.querySelectorAll('.metro-nav .pivot-tab')].map((a) => ({
      loc: a.getAttribute('data-loc'),
      active: a.classList.contains('active'),
      opacity: getComputedStyle(a).opacity,
    }));
    return {
      hamExists: !!document.querySelector('.metro-nav .hamburger'),
      dropdownExists: !!document.querySelector('.metro-nav .app-bar-menu'),
      navBg: nav ? getComputedStyle(nav).backgroundColor : null,
      navH: nav?.getBoundingClientRect().height,
      tabs,
      activeLocale: tabs.find((t) => t.active)?.loc,
    };
  });
  log.push({ step: label, ...d });
  return d;
}

try {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push({ kind: 'pageerror', msg: e.message }));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
      errors.push({ kind: 'console', msg: m.text() });
    }
  });

  // STEP 1 — fresh load home in light mode. IMMEDIATELY check nav before any click.
  await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark-side');
    try { localStorage.setItem('cantopedia-theme', 'light'); } catch (e) {}
  });
  // Force reload so theme persists from localStorage, not runtime mutation.
  await page.reload({ waitUntil: 'networkidle' });
  await snapNav(page, '1-fresh-load-light-no-interaction');
  await page.screenshot({ path: resolve(OUT, 'wt-1-fresh-home.png'), fullPage: false });

  // STEP 2 — scroll down a bit to land where hero meets tiles
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(200);
  await snapNav(page, '2-scrolled-400');
  await page.screenshot({ path: resolve(OUT, 'wt-2-scrolled.png'), fullPage: false });

  // STEP 3 — click a category tile (SPA-nav into browse page)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const tile = page.locator('a[href*="/browse/"]').first();
  const tileCount = await tile.count();
  if (tileCount > 0) {
    await tile.click();
    await page.waitForTimeout(700);
    await snapNav(page, '3-after-category-tile');
    await page.screenshot({ path: resolve(OUT, 'wt-3-browse.png'), fullPage: false });
  }

  // STEP 4 — click a dish from the category
  const dish = page.locator('a[href*="/dishes/"]').first();
  if ((await dish.count()) > 0) {
    await dish.click();
    await page.waitForTimeout(700);
    await snapNav(page, '4-after-dish-click');
    await page.screenshot({ path: resolve(OUT, 'wt-4-dish.png'), fullPage: false });
  }

  // STEP 5 — switch to EN
  await page.click('.metro-nav .pivot-tab[data-loc="en"]');
  await page.waitForTimeout(700);
  await snapNav(page, '5-after-en-switch');
  await page.screenshot({ path: resolve(OUT, 'wt-5-en.png'), fullPage: false });

  // STEP 6 — switch to 粵
  await page.click('.metro-nav .pivot-tab[data-loc="yue"]');
  await page.waitForTimeout(700);
  await snapNav(page, '6-after-yue-switch');
  await page.screenshot({ path: resolve(OUT, 'wt-6-yue.png'), fullPage: false });

  // STEP 7 — toggle dark
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(200);
  await snapNav(page, '7-after-dark-toggle');
  await page.screenshot({ path: resolve(OUT, 'wt-7-dark.png'), fullPage: false });

  // STEP 8 — open More menu, change accent
  await page.click('[data-appbar="more"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT, 'wt-8a-more-open.png'), fullPage: false });
  await page.click('[data-accent-swatch="orange"]');
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await snapNav(page, '8-after-more-orange-close');
  await page.screenshot({ path: resolve(OUT, 'wt-8b-after-orange.png'), fullPage: false });

  // STEP 9 — toggle back to light
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(200);
  await snapNav(page, '9-back-to-light');
  await page.screenshot({ path: resolve(OUT, 'wt-9-light-orange.png'), fullPage: false });

  // STEP 10 — navigate home via brand
  await page.click('.metro-nav .brand');
  await page.waitForTimeout(700);
  await snapNav(page, '10-back-home-via-brand');
  await page.screenshot({ path: resolve(OUT, 'wt-10-home-again.png'), fullPage: false });

  await ctx.close();

  writeFileSync(resolve(OUT, 'nav-walkthrough.json'), JSON.stringify({ log, errors }, null, 2));
  console.log('--- WALKTHROUGH RESULT ---');
  console.log(`steps:        ${log.length}`);
  console.log(`hamburger:    ${log.every((s) => s.hamExists === false) ? 'NEVER appeared ✓' : 'APPEARED somewhere ✗'}`);
  console.log(`dropdown:     ${log.every((s) => s.dropdownExists === false) ? 'NEVER appeared ✓' : 'APPEARED somewhere ✗'}`);
  console.log(`page errors:  ${errors.filter((e) => e.kind === 'pageerror').length}`);
  console.log(`console errs: ${errors.filter((e) => e.kind === 'console').length}`);
  for (const s of log) {
    console.log(`  ${s.step.padEnd(40)} active=${s.activeLocale} ham=${s.hamExists} bg=${s.navBg}`);
  }
  if (errors.length) {
    console.log('\nerrors:', JSON.stringify(errors, null, 2));
  }
} finally {
  await browser.close();
}
