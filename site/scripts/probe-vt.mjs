// Check whether View Transition pseudos are actually creating animated layers.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Intercept startViewTransition to log
await page.evaluate(() => {
  window.__vtEvents = [];
  const orig = document.startViewTransition?.bind(document);
  if (orig) {
    document.startViewTransition = (cb) => {
      window.__vtEvents.push({ t: performance.now(), event: 'startViewTransition' });
      const t = orig(cb);
      t.ready.then(() => window.__vtEvents.push({ t: performance.now(), event: 'ready', cls: document.documentElement.className }));
      t.finished.then(() => window.__vtEvents.push({ t: performance.now(), event: 'finished' }));
      return t;
    };
  }
  // Sample html class every 50ms for 1s
  let n = 0;
  const sampleInterval = setInterval(() => {
    window.__vtEvents.push({ t: performance.now(), event: 'sample', cls: document.documentElement.className });
    if (++n > 30) clearInterval(sampleInterval);
  }, 50);
});

// Click
await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(1500);

const events = await page.evaluate(() => window.__vtEvents);
console.log('VT events:');
events.forEach((e) => {
  if (e.event === 'sample' && e.cls === '') return; // skip empty-class samples
  console.log(' ', e.t.toFixed(0) + 'ms', e.event, e.cls !== undefined ? `cls="${e.cls}"` : '');
});

// Check VT support
const vtSupport = await page.evaluate(() => typeof document.startViewTransition === 'function');
console.log('\nView Transition support:', vtSupport);

await browser.close();
