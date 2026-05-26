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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark-side', t === 'dark');
    try { localStorage.setItem('cantopedia-theme', t); } catch (e) {}
  }, theme);
  await page.waitForTimeout(120);
}

async function diag(page, step) {
  const d = await page.evaluate(() => {
    const nav = document.querySelector('.metro-nav.app-bar');
    return {
      // Stuff that SHOULD be gone:
      moreBtnExists: !!document.querySelector('[data-appbar="more"]'),
      moreDialogExists: !!document.getElementById('appbar-more-menu'),
      swatchExists: !!document.querySelector('[data-accent-swatch]'),
      hamExists: !!document.querySelector('.metro-nav .hamburger'),
      dropdownExists: !!document.querySelector('.metro-nav .app-bar-menu'),
      dataAccent: document.documentElement.getAttribute('data-accent'),
      // Stuff that SHOULD remain:
      brandText: nav?.querySelector('.brand-name')?.textContent?.trim(),
      themeBtnExists: !!nav?.querySelector('[data-theme-toggle]'),
      switcherExists: !!nav?.querySelector('.locale-switcher'),
      tabs: [...nav?.querySelectorAll('.pivot-tab') ?? []].map((a) => ({
        loc: a.getAttribute('data-loc'),
        active: a.classList.contains('active'),
      })),
      activeLocale: nav?.querySelector('.pivot-tab.active')?.getAttribute('data-loc'),
      navBg: nav ? getComputedStyle(nav).backgroundColor : null,
      accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    };
  });
  log.push({ step, ...d });
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

  // 1) Fresh load home, light, NO interaction.
  await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
  await setTheme(page, 'light');
  await page.reload({ waitUntil: 'networkidle' });
  await diag(page, '1-fresh-light');
  await page.screenshot({ path: resolve(OUT, 'min-1-light.png'), clip: { x: 0, y: 0, width: 414, height: 80 } });

  // 2) Toggle dark.
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(180);
  await diag(page, '2-after-dark-toggle');
  await page.screenshot({ path: resolve(OUT, 'min-2-dark.png'), clip: { x: 0, y: 0, width: 414, height: 80 } });

  // 3) Toggle back to light.
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(180);
  await diag(page, '3-back-to-light');

  // 4) Switch locale to EN.
  await page.click('.metro-nav .pivot-tab[data-loc="en"]');
  await page.waitForTimeout(700);
  await diag(page, '4-after-en-switch');
  await page.screenshot({ path: resolve(OUT, 'min-3-en.png'), clip: { x: 0, y: 0, width: 414, height: 80 } });

  // 5) SPA-nav to category.
  const tile = page.locator('a[href*="/browse/"]').first();
  if ((await tile.count()) > 0) {
    await tile.click();
    await page.waitForTimeout(700);
    await diag(page, '5-after-category-nav');
  }

  // 6) Click brand back home.
  await page.click('.metro-nav .brand');
  await page.waitForTimeout(700);
  await diag(page, '6-back-home');

  // Desktop check.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push({ kind: 'pageerror-desktop', msg: e.message }));
  await page2.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
  await setTheme(page2, 'light');
  await page2.reload({ waitUntil: 'networkidle' });
  await diag(page2, '7-desktop-light');
  await page2.screenshot({ path: resolve(OUT, 'min-4-desktop.png'), clip: { x: 0, y: 0, width: 1280, height: 60 } });
  await ctx2.close();
  await ctx.close();

  writeFileSync(resolve(OUT, 'nav-minimal.json'), JSON.stringify({ log, errors }, null, 2));

  console.log('--- VERIFICATION ---');
  const removed = ['moreBtnExists', 'moreDialogExists', 'swatchExists', 'hamExists', 'dropdownExists'];
  for (const k of removed) {
    const allGone = log.every((s) => s[k] === false);
    console.log(`  ${k.padEnd(20)} ${allGone ? 'gone ✓' : 'STILL PRESENT ✗'}`);
  }
  const dataAccentGone = log.every((s) => s.dataAccent === null);
  console.log(`  data-accent attr     ${dataAccentGone ? 'gone ✓' : 'still set ✗'}`);
  console.log();
  console.log('errors:', errors.length === 0 ? 'none ✓' : JSON.stringify(errors, null, 2));
  console.log();
  for (const s of log) {
    console.log(`  ${s.step.padEnd(28)} active=${s.activeLocale} bg=${s.navBg} accent=${s.accentVar}`);
  }
} finally {
  await browser.close();
}
