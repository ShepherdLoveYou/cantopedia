import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('site/probe-out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
// trailingSlash:'never' in astro.config — use path without trailing slash
await page.goto('http://localhost:4322/cantopedia/zh', { waitUntil: 'networkidle' });

const initial = await page.evaluate(() => ({
  featuredHref: document.getElementById('featured-tile')?.getAttribute('href'),
  scrollLeft: document.getElementById('hub')?.scrollLeft,
}));

// Click the start-screen tile for noodle — inside the visible home panel.
// The drawer-cat links with the same href are in a hidden off-screen drawer.
await page.click('.start-screen a[href*="/browse/noodle"]');
await page.waitForURL('**/browse/noodle', { timeout: 10000 });
await page.waitForLoadState('networkidle');
// Give initHubNav's requestAnimationFrame scroll a moment to settle.
await page.waitForTimeout(600);

const afterNav = await page.evaluate(() => ({
  featuredExists: !!document.getElementById('featured-tile'),
  featuredFacesHaveImg: Array.from(document.querySelectorAll('.featured-face .featured-img'))
    .map((el) => !!getComputedStyle(el).backgroundImage && getComputedStyle(el).backgroundImage !== 'none'),
  hubScrollLeft: document.getElementById('hub')?.scrollLeft,
  // Panel left relative to the hub container's own left edge (not viewport).
  // When noodle is the active panel, this should be ~0 (within scroll-snap tolerance).
  hubPanelInView: (() => {
    const panel = document.querySelector('.hub-panel[data-panel="noodle"]');
    const hub = document.getElementById('hub');
    if (!panel || !hub) return null;
    return panel.getBoundingClientRect().left - hub.getBoundingClientRect().left;
  })(),
}));

writeFileSync('site/probe-out/spa-nav.json', JSON.stringify({ initial, afterNav }, null, 2));
console.log(JSON.stringify({ initial, afterNav }, null, 2));

let ok = true;
if (!afterNav.featuredExists) {
  console.error('FAIL: featured tile missing after nav'); ok = false;
}
const facesWithImg = afterNav.featuredFacesHaveImg.filter(Boolean).length;
if (facesWithImg === 0) {
  console.error('FAIL: featured tile faces have no background-image — featured-tile script did not re-init');
  ok = false;
}
if (Math.abs(afterNav.hubPanelInView ?? -9999) > 50) {
  console.error(`FAIL: noodle panel not scrolled into view (left=${afterNav.hubPanelInView})`);
  ok = false;
}
await browser.close();
process.exit(ok ? 0 : 1);
