// Find exactly when nav-next class is cleared by sampling every 5ms.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.__log = [];
  let prevCls = document.documentElement.className;
  setInterval(() => {
    const cls = document.documentElement.className;
    if (cls !== prevCls) {
      window.__log.push({ t: performance.now(), event: 'CHANGE', from: prevCls, to: cls });
      prevCls = cls;
    }
  }, 5);
  ['before-preparation', 'before-swap', 'after-swap', 'page-load'].forEach((ev) => {
    document.addEventListener('astro:' + ev, () => {
      window.__log.push({ t: performance.now(), event: ev, cls: document.documentElement.className });
    });
  });
});

await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(2000);

const log = await page.evaluate(() => window.__log);
log.forEach((e) => {
  const extra = Object.entries(e).filter(([k]) => !['t', 'event'].includes(k)).map(([k, v]) => `${k}="${v}"`).join(' ');
  console.log(' ', e.t.toFixed(0) + 'ms', e.event, extra);
});

await browser.close();
