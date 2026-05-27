import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const BASE = `http://localhost:${PORT}/cantopedia`;

const cases = [
  { url: `${BASE}/zh`, mode: 'light', w: 414, name: 'home-mobile-light' },
  { url: `${BASE}/zh`, mode: 'dark',  w: 414, name: 'home-mobile-dark' },
  { url: `${BASE}/zh`, mode: 'light', w: 1280, name: 'home-desktop-light' },
  { url: `${BASE}/zh`, mode: 'dark',  w: 1280, name: 'home-desktop-dark' },
  { url: `${BASE}/zh/browse/main`, mode: 'light', w: 414, name: 'browse-mobile-light' },
];

const browser = await chromium.launch();
const results = [];
try {
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(c.url, { waitUntil: 'networkidle' });
    await page.evaluate((m) => {
      try { localStorage.setItem('cantopedia-theme', m); } catch (e) {}
      document.documentElement.classList.toggle('dark-side', m === 'dark');
    }, c.mode);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);  // wait for tile cascade to complete

    const d = await page.evaluate(() => {
      const nav = document.querySelector('.metro-nav.app-bar');
      const navCs = nav ? getComputedStyle(nav) : null;
      const title = document.querySelector('.hub-pivot-title');
      const titleCs = title ? getComputedStyle(title) : null;
      const titleRect = title?.getBoundingClientRect();
      const tile = document.querySelector('.tiles-grid > *');
      const tileCs = tile ? getComputedStyle(tile) : null;
      return {
        nav: {
          bg: navCs?.backgroundColor,
          backdropFilter: navCs?.backdropFilter || navCs?.['-webkit-backdrop-filter'] || 'none',
          isolation: navCs?.isolation,
        },
        title: {
          text: title?.textContent?.trim(),
          fontSize: titleCs?.fontSize,
          fontWeight: titleCs?.fontWeight,
          letterSpacing: titleCs?.letterSpacing,
          width: titleRect ? Math.round(titleRect.width) : null,
        },
        tile1: {
          animation: tileCs?.animationName,
          delay: tileCs?.animationDelay,
          duration: tileCs?.animationDuration,
        },
      };
    });
    await page.screenshot({ path: resolve(OUT, `wp10-${c.name}.png`), fullPage: false });
    results.push({ ...c, ...d });
  }
  writeFileSync(resolve(OUT, 'wp10-tier1.json'), JSON.stringify(results, null, 2));

  console.log('--- WP10 Tier-1 verification ---');
  for (const r of results) {
    console.log(`  ${r.name.padEnd(22)}  navBg=${r.nav.bg}  backdrop=${r.nav.backdropFilter.slice(0,30)}  titleSize=${r.title.fontSize} fw=${r.title.fontWeight}  tileAnim=${r.tile1.animation} delay=${r.tile1.delay}`);
  }
} finally {
  await browser.close();
}
