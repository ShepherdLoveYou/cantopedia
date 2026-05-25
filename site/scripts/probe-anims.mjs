// Use document.getAnimations() to enumerate what's actually animating
// on the view-transition pseudo-elements during a nav.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.__anims = [];
  // Sample running animations every 30ms
  setInterval(() => {
    const anims = document.getAnimations().map((a) => ({
      name: a.animationName,
      target: a.effect?.target?.tagName ?? null,
      pseudo: a.effect?.pseudoElement ?? null,
      state: a.playState,
      time: a.currentTime,
    }));
    if (anims.length) {
      window.__anims.push({ t: performance.now(), anims });
    }
  }, 30);
});

await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(1500);

const log = await page.evaluate(() => window.__anims);
log.forEach((e) => {
  console.log(`${e.t.toFixed(0)}ms`);
  e.anims.forEach((a) => console.log(`  ${a.name || '(no name)'} ${a.pseudo || ''} target=${a.target} state=${a.state} t=${a.time}`));
});

await browser.close();
