// Probe pivot left/right nav animation by clicking prev/next and capturing
// the html classlist + computed animation on ::view-transition-* during nav.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Set up listener BEFORE click to capture mid-transition state
await page.evaluate(() => {
  window.__navObs = [];
  // Watch htmlclassList changes
  const obs = new MutationObserver(() => {
    window.__navObs.push({
      t: performance.now(),
      cls: document.documentElement.className,
    });
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Hook into astro view transition events
  document.addEventListener('astro:before-preparation', () => window.__navObs.push({ t: performance.now(), event: 'before-preparation' }));
  document.addEventListener('astro:before-swap', () => window.__navObs.push({ t: performance.now(), event: 'before-swap' }));
  document.addEventListener('astro:after-swap', () => window.__navObs.push({ t: performance.now(), event: 'after-swap' }));
  document.addEventListener('astro:page-load', () => window.__navObs.push({ t: performance.now(), event: 'page-load' }));
});

// Click the next pivot link
const nextLink = page.locator('.pivot[data-dir="next"]');
const nextHref = await nextLink.getAttribute('href');
console.log('Clicking next pivot:', nextHref);
await nextLink.click();

await page.waitForTimeout(1200);

const obs = await page.evaluate(() => window.__navObs);
console.log('Nav timeline:');
obs.forEach((o) => console.log(' ', o.t.toFixed(0) + 'ms', o.event ?? `cls="${o.cls}"`));

console.log('\nFinal URL:', page.url());

// Check whether the slide CSS would have applied
const slideCheck = await page.evaluate(() => {
  // Synthesize a check: temporarily add nav-next, query computed animation on body
  document.documentElement.classList.add('nav-next');
  // CSS animation names are on the pseudo-element ::view-transition-old(root) which
  // we can't getComputedStyle on. Instead, parse stylesheets:
  const found = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        const t = rule.cssText;
        if (t.includes('nav-next::view-transition') || t.includes('nav-prev::view-transition')) {
          found.push(t.slice(0, 180));
        }
      }
    } catch {}
  }
  document.documentElement.classList.remove('nav-next');
  return found;
});
console.log('\nSlide rules in stylesheets:');
slideCheck.forEach((r) => console.log(' ', r));

await browser.close();
