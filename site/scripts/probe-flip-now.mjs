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
await p.waitForTimeout(800);

// Probe: are CSS animations actually running? Read computed animation-name
const animInfo = await p.evaluate(() => {
  const tiles = Array.from(document.querySelectorAll('.cat-tile-v5'));
  return tiles.map((t, i) => {
    const cs = getComputedStyle(t);
    return {
      idx: i,
      hasBack: t.classList.contains('has-back'),
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      animationDelay: cs.animationDelay,
      flipDelay: cs.getPropertyValue('--flip-delay').trim(),
      transform: cs.transform.slice(0, 70),
      perspective: getComputedStyle(t.parentElement).perspective,
    };
  });
});
console.log(JSON.stringify(animInfo, null, 2));

// Capture frames every 400ms for 8s — one full cycle of the 7s animation
for (let i = 0; i < 20; i++) {
  await p.screenshot({ path: resolve(OUT, `flipnow-${String(i).padStart(2, '0')}.png`), clip: { x: 40, y: 95, width: 800, height: 420 } });
  await p.waitForTimeout(400);
}
await browser.close();
console.log('Captured 20 frames flipnow-00..19.png');
