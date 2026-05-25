// FPS during hub pivot scroll (no DOM swap; pure scroll-snap).

import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const result = await page.evaluate(() => {
  return new Promise((resolve) => {
    let frameCount = 0, lastT = performance.now(), durations = [], rec = false;
    function tick(t) {
      if (rec) { durations.push(t - lastT); frameCount++; }
      lastT = t;
      if (frameCount < 80) requestAnimationFrame(tick);
      else resolve({ frameCount, durations });
    }
    setTimeout(() => {
      rec = true;
      lastT = performance.now();
      requestAnimationFrame(tick);
      const hub = document.getElementById('hub');
      const btn = document.getElementById('hub-pivot-next');
      window.__before = { scrollLeft: hub?.scrollLeft, hasBtn: !!btn };
      btn?.click();
      // Sample scroll position over time
      setTimeout(() => { window.__after100 = hub?.scrollLeft; }, 100);
      setTimeout(() => { window.__after500 = hub?.scrollLeft; }, 500);
      setTimeout(() => { window.__after1000 = hub?.scrollLeft; }, 1000);
    }, 100);
  });
});

const mean = result.durations.reduce((a, b) => a + b, 0) / result.durations.length;
const sorted = [...result.durations].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const max = Math.max(...result.durations);
const long = result.durations.filter((d) => d > 20).length;

console.log('Hub pivot scroll:');
console.log('  Frames:', result.frameCount);
console.log('  Mean:  ', mean.toFixed(1), 'ms');
console.log('  p95:   ', p95.toFixed(1), 'ms');
console.log('  Max:   ', max.toFixed(1), 'ms');
console.log('  Long:  ', long, '(> 20ms)');

// URL change?
const newUrl = await page.url();
console.log('  Final URL:', newUrl);
const debug = await page.evaluate(() => ({ before: window.__before, after100: window.__after100, after500: window.__after500, after1000: window.__after1000 }));
console.log('  Debug:', JSON.stringify(debug));

await browser.close();
