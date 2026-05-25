// Verify all 4 view-transition motion items from the user's spec:
// ★★★★☆ Tile click → detail (morph via view-transition-name)
// ★★★ Page enter fade (default VT)
// ★★★ Back nav reverse (VT auto-pairs)
// ★★★★ Pivot slide (custom slide-out-left / slide-in-right)

import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

async function captureAnims(label, navAction) {
  await page.evaluate(() => { window.__anims = []; });
  await page.evaluate(() => {
    window.__animSampler = setInterval(() => {
      const anims = document.getAnimations()
        .filter((a) => a.effect?.pseudoElement?.includes('view-transition'))
        .map((a) => a.animationName);
      if (anims.length) window.__anims.push({ t: performance.now(), anims });
    }, 30);
  });

  await navAction();
  await page.waitForTimeout(800);

  await page.evaluate(() => clearInterval(window.__animSampler));
  const log = await page.evaluate(() => window.__anims);
  const uniqueAnims = new Set();
  log.forEach((s) => s.anims.forEach((a) => uniqueAnims.add(a)));

  console.log(`\n=== ${label} ===`);
  console.log('Animations observed during nav:');
  Array.from(uniqueAnims).forEach((a) => console.log(' ', a));
  return uniqueAnims;
}

// 1. Pivot slide
await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const pivotAnims = await captureAnims('Pivot next click', async () => {
  await page.locator('.pivot[data-dir="next"]').click();
});
const pivotOk = pivotAnims.has('slide-in-right') && pivotAnims.has('slide-out-left');
console.log('PIVOT SLIDE:', pivotOk ? '✅' : '❌');

// 2. Tile → detail morph (click a dish card)
await page.waitForTimeout(500);
await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const morphAnims = await captureAnims('Tile to dish', async () => {
  const dishLink = page.locator('.dish-card').first();
  if (await dishLink.count() > 0) await dishLink.click();
});
const morphOk = Array.from(morphAnims).some((a) => a.includes('view-transition'));
console.log('TILE→DETAIL MORPH:', morphOk ? '✅' : '❌');

// 3. Back nav reverse (after the morph, hit back)
await page.waitForTimeout(500);
const backAnims = await captureAnims('Back nav', async () => {
  await page.goBack();
});
const backOk = backAnims.size > 0;
console.log('BACK NAV:', backOk ? '✅' : '❌');

// 4. Page enter fade — first nav from home to browse (no view-transition-name on home)
await page.goto(BASE + '/zh', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const pageAnims = await captureAnims('Home to browse', async () => {
  await page.locator('.start-screen a').first().click();
});
const pageOk = pageAnims.size > 0;
console.log('PAGE ENTER FADE:', pageOk ? '✅' : '❌');

await browser.close();

if (pivotOk && morphOk && backOk && pageOk) {
  console.log('\nALL VT ANIMATIONS OK');
} else {
  console.error('\nSOME VT ANIMATIONS MISSING');
  process.exit(1);
}
