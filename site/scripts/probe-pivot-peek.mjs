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
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => ({
    peekPrev: document.getElementById('hub-pivot-peek-prev')?.textContent,
    peekNext: document.getElementById('hub-pivot-peek-next')?.textContent,
    title: document.getElementById('hub-pivot-title')?.textContent,
  }));

  writeFileSync(resolve(OUT, 'pivot-peek.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await page.screenshot({ path: resolve(OUT, 'pivot-peek.png') });

  if (!result.peekPrev || result.peekPrev.trim() === '') { console.error('FAIL: peekPrev empty'); ok = false; }
  if (!result.peekNext || result.peekNext.trim() === '') { console.error('FAIL: peekNext empty'); ok = false; }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
