import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');

const browser = await chromium.launch();
for (const loc of ['zh', 'en', 'yue']) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(`http://localhost:4321/cantopedia/${loc}/all`, { waitUntil: 'networkidle' });
  await p.screenshot({ path: resolve(OUT, `applist-${loc}-desktop.png`), fullPage: false });
  await p.close();
}
// Mobile
{
  const p = await browser.newPage({ viewport: { width: 375, height: 700 } });
  await p.goto(`http://localhost:4321/cantopedia/en/all`, { waitUntil: 'networkidle' });
  await p.screenshot({ path: resolve(OUT, `applist-en-mobile.png`), fullPage: false });
  await p.close();
}
await browser.close();
console.log('Captured applist screenshots');
