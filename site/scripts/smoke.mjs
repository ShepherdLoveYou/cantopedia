// Headless visual + interaction smoke for Cantopedia.
// Runs against the LIVE production deploy (or local dev if BASE_URL=http://localhost:4321).
// Outputs JSON report to stdout; non-zero exit on any failure.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';
const OUT = process.env.SMOKE_OUT ?? './smoke-out';
mkdirSync(OUT, { recursive: true });

const failures = [];
const log = (...a) => console.log('[smoke]', ...a);
const fail = (id, msg) => { failures.push({ id, msg }); console.error('[FAIL]', id, msg); };
const ok = (id) => console.log('[ok]', id);

const checks = [
  { name: 'home_zh', url: '/zh' },
  { name: 'home_en', url: '/en' },
  { name: 'home_yue', url: '/yue' },
  { name: 'browse_rice_zh', url: '/zh/browse/rice' },
  { name: 'dish_zh', url: null }, // resolved dynamically from home
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

for (const c of checks) {
  if (!c.url) continue;
  const url = BASE + c.url;
  log('GET', url);
  errors.length = 0;
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => { fail(c.name + '_load', e.message); return null; });
  if (!resp) continue;
  if (resp.status() >= 400) { fail(c.name + '_status', `HTTP ${resp.status()}`); continue; }

  // Wait for tile entrance animations to finish before screenshotting
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, c.name + '.png'), fullPage: false });

  // Per-page assertions
  if (c.url.startsWith('/zh')) {
    const lang = await page.getAttribute('html', 'lang');
    if (lang !== 'zh-Hant') fail(c.name + '_lang', `html lang=${lang}, expected zh-Hant`);
    else ok(c.name + '_lang');
  }
  if (c.url.startsWith('/en')) {
    const lang = await page.getAttribute('html', 'lang');
    if (lang !== 'en') fail(c.name + '_lang', `html lang=${lang}, expected en`);
    else ok(c.name + '_lang');
  }
  if (c.url.startsWith('/yue')) {
    const lang = await page.getAttribute('html', 'lang');
    if (lang !== 'yue-Hant') fail(c.name + '_lang', `html lang=${lang}, expected yue-Hant`);
    else ok(c.name + '_lang');
  }
  if (c.url === '/zh' || c.url === '/en' || c.url === '/yue') {
    const tileCount = await page.locator('.wp-tile').count();
    if (tileCount < 6) fail(c.name + '_tiles', `expected >=6 .wp-tile, got ${tileCount}`);
    else ok(c.name + '_tiles_' + tileCount);
    const liveTileCount = await page.locator('.live-tile').count();
    if (liveTileCount !== 4) fail(c.name + '_live_tiles', `expected 4 .live-tile, got ${liveTileCount}`);
    else ok(c.name + '_live_tiles');
  }
  if (errors.length) fail(c.name + '_runtime', errors.join(' || '));
  else ok(c.name + '_no_runtime_errors');
}

// Drawer i18n test — open drawer on /zh, then nav to /en, then open drawer, expect English labels
log('Drawer i18n test');
errors.length = 0;
await page.goto(BASE + '/zh', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('#hamburger');
await page.waitForTimeout(400);
const zhBrowseLabel = await page.locator('.drawer-section-label').first().textContent();
log('zh drawer first label:', zhBrowseLabel);
// Close drawer
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Nav to /en via locale switcher
const enLink = page.locator('a.pivot-tab[data-loc="en"]').first();
await enLink.click();
await page.waitForTimeout(800);
await page.click('#hamburger');
await page.waitForTimeout(400);
const enBrowseLabel = await page.locator('.drawer-section-label').first().textContent();
log('en drawer first label:', enBrowseLabel);

if (zhBrowseLabel?.trim() === enBrowseLabel?.trim()) {
  fail('drawer_i18n', `drawer labels did not change after locale switch: zh="${zhBrowseLabel}" en="${enBrowseLabel}"`);
} else {
  ok('drawer_i18n');
}

// Hover lift smoke — does hover on .wp-tile trigger a transform change?
log('Hover lift test');
await page.goto(BASE + '/zh', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // wait past entrance stagger
const tile = page.locator('.wp-tile').first();
const idleTransform = await tile.evaluate((el) => getComputedStyle(el).transform);
await tile.hover();
await page.waitForTimeout(500);
const hoverTransform = await tile.evaluate((el) => getComputedStyle(el).transform);
log('idle transform:', idleTransform);
log('hover transform:', hoverTransform);
if (idleTransform === hoverTransform) {
  fail('hover_lift', `transform did not change on hover: ${idleTransform}`);
} else {
  ok('hover_lift');
}

await browser.close();

writeFileSync(join(OUT, 'report.json'), JSON.stringify({ failures, time: new Date().toISOString() }, null, 2));

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nALL OK');
