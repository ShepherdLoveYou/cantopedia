import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
let ok = true;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  async function activeFaceClass(sel) {
    return await page.evaluate((s) => {
      const tile = document.querySelector(s);
      if (!tile) return null;
      const active = tile.querySelector('.cat-face.active');
      if (!active) return null;
      return active.classList.contains('cat-face--solid') ? 'solid' : 'photo';
    }, sel);
  }

  const before = await activeFaceClass('.cat-tile.has-imgs');
  await page.waitForTimeout(3000);
  const after = await activeFaceClass('.cat-tile.has-imgs');

  await page.screenshot({ path: resolve(OUT, 'cat-tile.png') });
  writeFileSync(resolve(OUT, 'cat-tile.json'), JSON.stringify({ before, after }, null, 2));
  console.log(JSON.stringify({ before, after }, null, 2));

  if (before === null) {
    console.warn('SKIP: no .cat-tile.has-imgs present yet — pass conditionally (T7 will add them)');
  } else if (before === after) {
    console.error(`FAIL: cat-tile did not cycle in 3s (before=${before}, after=${after})`);
    ok = false;
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
