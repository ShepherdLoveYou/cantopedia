import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out', 'flip-master');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

// Take 12 screenshots over 6 seconds at the cat-tile grid
const clip = await p.evaluate(() => {
  const grid = document.querySelector('.tiles-grid.start-tiles');
  if (!grid) return null;
  const r = grid.getBoundingClientRect();
  return { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), width: Math.min(1280, Math.floor(r.width)), height: Math.min(800 - Math.floor(r.top), Math.floor(r.height)) };
});

const states = [];
for (let i = 0; i < 14; i++) {
  await p.screenshot({ path: resolve(OUT, `t-${String(i * 500).padStart(5, '0')}.png`), clip });
  const s = await p.evaluate(() => {
    const tile = document.querySelector('.cat-tile');
    if (!tile) return null;
    const flipped = tile.classList.contains('flipped');
    const front = tile.querySelector('.face.front');
    const back = tile.querySelector('.face.back');
    return {
      flipped,
      frontTransform: front ? getComputedStyle(front).transform.slice(0, 50) : null,
      backTransform: back ? getComputedStyle(back).transform.slice(0, 50) : null,
      frontVisibility: front ? getComputedStyle(front).backfaceVisibility : null,
    };
  });
  states.push({ t: i * 500, ...s });
  await p.waitForTimeout(500);
}

console.log(JSON.stringify(states, null, 2));
await browser.close();
console.log('Screenshots in', OUT);
