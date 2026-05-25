// Lightweight performance probe via playwright.
// Measures: FCP, LCP, CLS, JS transfer size.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

let bytes = { js: 0, css: 0, font: 0, img: 0, other: 0 };
page.on('response', async (resp) => {
  try {
    const type = resp.headers()['content-type'] ?? '';
    const sz = parseInt(resp.headers()['content-length'] ?? '0', 10) || 0;
    if (type.includes('javascript')) bytes.js += sz;
    else if (type.includes('css')) bytes.css += sz;
    else if (type.includes('font')) bytes.font += sz;
    else if (type.includes('image')) bytes.img += sz;
    else bytes.other += sz;
  } catch {}
});

const metrics = {};
await page.goto(BASE + '/zh', { waitUntil: 'load' });

const navTiming = await page.evaluate(() => {
  const t = performance.timing;
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint').reduce((a, p) => ({ ...a, [p.name]: p.startTime }), {});
  return {
    domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
    loadEnd: nav?.loadEventEnd ?? 0,
    fcp: paints['first-contentful-paint'] ?? null,
    fp: paints['first-paint'] ?? null,
  };
});
metrics.navTiming = navTiming;

// LCP via PerformanceObserver
await page.waitForTimeout(2500);
const lcp = await page.evaluate(() => {
  return new Promise((resolve) => {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      resolve(last?.startTime ?? null);
    });
    try {
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { resolve(null); }
    setTimeout(() => resolve(null), 1000);
  });
});
metrics.lcp = lcp;

// CLS via PerformanceObserver
const cls = await page.evaluate(() => {
  let v = 0;
  const obs = new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => {
      if (!e.hadRecentInput) v += e.value;
    });
  });
  try {
    obs.observe({ type: 'layout-shift', buffered: true });
  } catch {}
  return v;
});
metrics.cls = cls;

console.log('=== Performance ===');
console.log('FCP:', metrics.navTiming.fcp?.toFixed(0), 'ms');
console.log('LCP:', metrics.lcp?.toFixed(0), 'ms');
console.log('CLS:', metrics.cls);
console.log('DCL:', metrics.navTiming.domContentLoaded.toFixed(0), 'ms');
console.log('Load:', metrics.navTiming.loadEnd.toFixed(0), 'ms');
console.log('\n=== Transfer (bytes) ===');
console.log('JS:  ', bytes.js);
console.log('CSS: ', bytes.css);
console.log('Font:', bytes.font);
console.log('Img: ', bytes.img);
console.log('Other:', bytes.other);
console.log('Total:', Object.values(bytes).reduce((a, b) => a + b, 0));

await browser.close();

// Thresholds
const fails = [];
if (metrics.navTiming.fcp && metrics.navTiming.fcp > 1800) fails.push('FCP >1.8s');
if (metrics.lcp && metrics.lcp > 2500) fails.push('LCP >2.5s');
if (metrics.cls > 0.1) fails.push('CLS >0.1');

if (fails.length) {
  console.error('\nFAIL:', fails.join(', '));
  process.exit(1);
}
console.log('\nPERF OK');
