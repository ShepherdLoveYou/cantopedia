import { chromium } from 'playwright';

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.emulateMedia({ reducedMotion: 'no-preference' });
p.on('console', m => console.log('[console]', m.type(), m.text()));
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

const states = [];
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const tile = document.querySelector('.cat-tile.has-imgs');
    if (!tile) return { ok: false, reason: 'no tile' };
    const faces = Array.from(tile.querySelectorAll('.cat-face'));
    const activeIdx = faces.findIndex(f => f.classList.contains('active'));
    return {
      activeIdx,
      activeIsSolid: activeIdx >= 0 ? faces[activeIdx].classList.contains('cat-face--solid') : null,
      wired: tile.dataset.cycleWired,
      hasStartTimeout: typeof tile._catTileStartTimeout !== 'undefined',
      totalFaces: faces.length,
    };
  });
  states.push({ t: (i + 1) * 500, ...s });
}
console.log(JSON.stringify(states, null, 2));
await browser.close();
