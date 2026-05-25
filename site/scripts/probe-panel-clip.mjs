import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';

const browser = await chromium.launch();
const results = [];
for (const vp of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 375, height: 667 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`http://localhost:${PORT}/cantopedia/zh`, { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const main = document.querySelector('main');
    const hub = document.getElementById('hub');
    const firstPanel = document.querySelector('.hub-panel');
    return {
      mainWidth: main?.getBoundingClientRect().width,
      mainPaddingLeft: main ? getComputedStyle(main).paddingLeft : null,
      mainPaddingRight: main ? getComputedStyle(main).paddingRight : null,
      hubWidth: hub?.getBoundingClientRect().width,
      panelWidth: firstPanel?.getBoundingClientRect().width,
      viewport: window.innerWidth,
    };
  });
  results.push({ vp, data });
  await page.screenshot({ path: resolve(OUT, `panel-clip-${vp.width}.png`) });
  await page.close();
}
await browser.close();

writeFileSync(resolve(OUT, 'panel-clip.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

let ok = true;
for (const { vp, data } of results) {
  const delta = Math.abs((data.panelWidth ?? 0) - vp.width);
  if (delta > 2) {
    console.error(`FAIL ${vp.width}x${vp.height}: panel width ${data.panelWidth} ≠ viewport ${vp.width} (Δ=${delta})`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
