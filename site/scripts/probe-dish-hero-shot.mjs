import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:4321/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

const heroBox = await p.evaluate(() => {
  const hero = document.querySelector('.dish-hero-banner');
  if (!hero) return null;
  const r = hero.getBoundingClientRect();
  const text = document.querySelector('.dish-hero-text');
  const tr = text?.getBoundingClientRect();
  return {
    heroHeight: r.height,
    heroWidth: r.width,
    textBox: tr ? { top: tr.top - r.top, left: tr.left, height: tr.height, width: tr.width } : null,
    childCount: text?.children.length ?? null,
  };
});

await p.screenshot({ path: 'probe-dish-hero.png', fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 700 } });
console.log(JSON.stringify(heroBox, null, 2));
await browser.close();
