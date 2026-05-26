import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, bypassCSP: true });
const p = await ctx.newPage();
// Disable all caching at network layer
await ctx.route('**/*', (route) => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache, no-store, must-revalidate', 'pragma': 'no-cache' };
  route.continue({ headers });
});
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

const result = await p.evaluate(() => {
  // Inspect first cat-tile-v5 with has-back
  const tile = document.querySelector('.cat-tile-v5.has-back');
  if (!tile) return { error: 'no .cat-tile-v5.has-back found' };
  const front = tile.querySelector('.slide--front');
  const back = tile.querySelector('.slide--back');
  const parentTilesGrid = tile.closest('.tiles-grid');

  function cs(el, props) {
    if (!el) return null;
    const c = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = c.getPropertyValue(p).trim();
    return out;
  }

  return {
    tileTag: tile.tagName + '.' + tile.className,
    tileAttrs: Array.from(tile.attributes).map((a) => `${a.name}="${a.value.slice(0, 30)}"`).join(' '),
    frontAttrs: front ? Array.from(front.attributes).map((a) => a.name).join(',') : null,
    parentGridDisplay: parentTilesGrid ? getComputedStyle(parentTilesGrid).display : null,
    parentGridPerspective: parentTilesGrid ? getComputedStyle(parentTilesGrid).perspective : null,
    tileComputed: cs(tile, ['animation-name', 'animation-duration', 'animation-delay', 'transform', 'overflow', '--flip-delay']),
    frontComputed: cs(front, ['animation-name', 'animation-duration', 'animation-delay', 'transform', 'backface-visibility', 'opacity']),
    backComputed: cs(back, ['animation-name', 'animation-duration', 'animation-delay', 'transform', 'backface-visibility', 'opacity']),
    // What stylesheets are loaded?
    sheetsLoaded: Array.from(document.styleSheets).map(s => {
      try { return s.href ? s.href.split('/').slice(-2).join('/').slice(0, 80) : '(inline)'; }
      catch { return '(cross-origin)'; }
    }),
  };
});

console.log(JSON.stringify(result, null, 2));

// Sample transform 4 times over 4 seconds — should change if animation is running
const samples = [];
for (let i = 0; i < 8; i++) {
  const t = await p.evaluate(() => {
    const f = document.querySelector('.cat-tile-v5.has-back .slide--front');
    return f ? getComputedStyle(f).transform.slice(0, 60) : null;
  });
  samples.push({ t: i * 500, transform: t });
  await p.waitForTimeout(500);
}
console.log('---Samples over 4s---');
console.log(JSON.stringify(samples, null, 2));

await browser.close();
