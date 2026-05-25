import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

// Crop to just the cat tiles area for clarity
const clip = await p.evaluate(() => {
  const grid = document.querySelector('.tiles-grid.start-tiles');
  const r = grid.getBoundingClientRect();
  return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(1280, r.width), height: Math.min(800 - r.top, r.height) };
});

for (let i = 0; i < 12; i++) {
  await p.screenshot({ path: resolve(OUT, `flip-${String(i).padStart(2, '0')}.png`), clip });
  await p.waitForTimeout(400);
}

// Also capture face transform state for the first tile across time
const states = [];
for (let i = 0; i < 12; i++) {
  await p.waitForTimeout(0); // sync — we already captured at 4800ms above
  const s = await p.evaluate(() => {
    const tile = document.querySelector('.cat-tile.has-imgs');
    const faces = Array.from(tile.querySelectorAll('.cat-face'));
    return faces.map((f, i) => ({
      i,
      type: f.classList.contains('cat-face--solid') ? 'solid' : 'photo',
      active: f.classList.contains('active'),
      transform: getComputedStyle(f).transform.slice(0, 50),
      opacity: getComputedStyle(f).opacity,
    }));
  });
  states.push({ t: i * 400, faces: s });
}
console.log(JSON.stringify(states.slice(0, 4), null, 2));
await browser.close();
console.log('Screenshots: flip-00.png .. flip-11.png in', OUT);
