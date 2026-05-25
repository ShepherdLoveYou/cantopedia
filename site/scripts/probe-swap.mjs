// Trace exactly what happens to html.class during ClientRouter swap.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.evaluate(() => {
  window.__log = [];
  const log = (e) => window.__log.push({ t: performance.now(), ...e });

  // Sample html class every 20ms
  setInterval(() => log({ event: 'tick', cls: document.documentElement.className }), 20);

  // Hook before-preparation
  document.addEventListener('astro:before-preparation', (e) => {
    log({ event: 'before-preparation', curCls: document.documentElement.className });
  });

  // Hook before-swap (run AFTER any existing handler)
  document.addEventListener('astro:before-swap', (e) => {
    log({ event: 'before-swap-late', curCls: document.documentElement.className, newDocCls: e.newDocument?.documentElement?.className ?? 'no-newDoc' });
  });

  document.addEventListener('astro:after-swap', () => {
    log({ event: 'after-swap', curCls: document.documentElement.className });
  });

  document.addEventListener('astro:page-load', () => {
    log({ event: 'page-load', curCls: document.documentElement.className });
  });
});

await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(1500);

const events = await page.evaluate(() => window.__log);

// Show only events around the transition (skip baseline ticks at empty)
const meaningful = events.filter((e, i, arr) => {
  if (e.event !== 'tick') return true;
  const prev = arr[i - 1];
  return !prev || (prev.cls !== e.cls);
});
console.log('Timeline (class transitions + events):');
meaningful.forEach((e) => {
  const extra = Object.entries(e).filter(([k]) => k !== 't' && k !== 'event').map(([k, v]) => `${k}="${v}"`).join(' ');
  console.log(' ', e.t.toFixed(0) + 'ms', e.event, extra);
});

await browser.close();
