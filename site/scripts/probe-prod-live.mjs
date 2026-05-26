import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const URL = 'https://shepherdloveyou.github.io/cantopedia/zh';

const browser = await chromium.launch();
const results = [];
try {
  for (const mode of ['light', 'dark']) {
    for (const w of [414, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push({ kind: 'pageerror', msg: e.message }));
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
          errs.push({ kind: 'console', msg: m.text() });
        }
      });

      // Bust cache.
      await page.goto(URL + '?_=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate((m) => {
        try { localStorage.setItem('cantopedia-theme', m); } catch (e) {}
        document.documentElement.classList.toggle('dark-side', m === 'dark');
      }, mode);
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);

      const diag = await page.evaluate(() => {
        const nav = document.querySelector('.metro-nav.app-bar');
        return {
          // Gone:
          moreBtnExists: !!document.querySelector('[data-appbar="more"]'),
          moreDialogExists: !!document.getElementById('appbar-more-menu'),
          swatchExists: !!document.querySelector('[data-accent-swatch]'),
          hamExists: !!document.querySelector('.metro-nav .hamburger'),
          dropdownExists: !!document.querySelector('.metro-nav .app-bar-menu'),
          dataAccent: document.documentElement.getAttribute('data-accent'),
          // Remaining:
          brandText: nav?.querySelector('.brand-name')?.textContent?.trim(),
          themeBtn: !!nav?.querySelector('[data-theme-toggle]'),
          tabCount: nav?.querySelectorAll('.pivot-tab').length ?? 0,
          activeLocale: nav?.querySelector('.pivot-tab.active')?.getAttribute('data-loc'),
          navBg: nav ? getComputedStyle(nav).backgroundColor : null,
          accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        };
      });

      await page.screenshot({ path: resolve(OUT, `prod-${mode}-${w}.png`), clip: { x: 0, y: 0, width: w, height: 50 } });
      results.push({ mode, w, ...diag, errors: errs });
      await ctx.close();
    }
  }

  writeFileSync(resolve(OUT, 'prod-verify.json'), JSON.stringify(results, null, 2));

  console.log('--- PROD VERIFICATION (commit 891d19f) ---');
  const removed = ['moreBtnExists', 'moreDialogExists', 'swatchExists', 'hamExists', 'dropdownExists'];
  for (const k of removed) {
    const allGone = results.every((r) => r[k] === false);
    console.log(`  ${k.padEnd(20)} ${allGone ? 'gone ✓' : 'STILL PRESENT ✗'}`);
  }
  const dataAccentGone = results.every((r) => r.dataAccent === null);
  console.log(`  data-accent attr     ${dataAccentGone ? 'gone ✓' : 'still set ✗'}`);
  console.log();
  for (const r of results) {
    console.log(`  ${r.mode}/${r.w}  bg=${r.navBg}  brand=${r.brandText}  themeBtn=${r.themeBtn}  tabs=${r.tabCount}  accent=${r.accentVar}  err=${r.errors.length}`);
  }
} finally {
  await browser.close();
}
