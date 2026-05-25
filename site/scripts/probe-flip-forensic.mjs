import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out', 'forensic');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await p.emulateMedia({ reducedMotion: 'no-preference' });
p.on('console', m => { if (m.type() === 'error' || m.text().includes('cat-tile')) console.log('[console]', m.type(), m.text()); });
p.on('pageerror', e => console.log('[pageerror]', e.message));

// Force no cache
await ctx.route('**/*', route => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache' };
  route.continue({ headers });
});

await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

// Inject MutationObserver to record every class change on cat-face elements
await p.evaluate(() => {
  window.__flipLog = [];
  window.__t0 = performance.now();
  const tiles = document.querySelectorAll('.cat-tile.has-imgs');
  if (tiles.length === 0) {
    window.__flipLog.push({ t: 0, event: 'NO_TILES' });
    return;
  }
  // Pick first tile
  const tile = tiles[0];
  const faces = tile.querySelectorAll('.cat-face');
  faces.forEach((face, i) => {
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        const cs = getComputedStyle(face);
        window.__flipLog.push({
          t: Math.round(performance.now() - window.__t0),
          faceIdx: i,
          isSolid: face.classList.contains('cat-face--solid'),
          active: face.classList.contains('active'),
          transform: cs.transform.slice(0, 60),
          opacity: cs.opacity,
          transitionProperty: cs.transitionProperty,
          transitionDuration: cs.transitionDuration,
        });
      });
    }).observe(face, { attributes: true, attributeFilter: ['class'] });
  });
});

// Take screenshots every 250ms for 6 seconds + record observer events
const shots = [];
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(250);
  await p.screenshot({ path: resolve(OUT, `t-${String(i * 250).padStart(5, '0')}.png`), clip: { x: 60, y: 110, width: 700, height: 400 } });
}

const log = await p.evaluate(() => window.__flipLog);
writeFileSync(resolve(OUT, 'mutation-log.json'), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));

// Also probe CURRENT transition property values for both .cat-face and .cat-face.active
const cssState = await p.evaluate(() => {
  const tile = document.querySelector('.cat-tile.has-imgs');
  if (!tile) return null;
  const inactive = tile.querySelector('.cat-face:not(.active)');
  const active = tile.querySelector('.cat-face.active');
  return {
    inactive: inactive ? {
      classList: inactive.className,
      transform: getComputedStyle(inactive).transform.slice(0, 60),
      opacity: getComputedStyle(inactive).opacity,
      transition: getComputedStyle(inactive).transition.slice(0, 100),
    } : null,
    active: active ? {
      classList: active.className,
      transform: getComputedStyle(active).transform.slice(0, 60),
      opacity: getComputedStyle(active).opacity,
      transition: getComputedStyle(active).transition.slice(0, 100),
    } : null,
  };
});
console.log('--- CURRENT CSS STATE ---');
console.log(JSON.stringify(cssState, null, 2));

await browser.close();
