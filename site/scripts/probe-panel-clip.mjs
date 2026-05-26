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
  // Check hubWidth (the scroll container) matches viewport — this is the
  // metric that actually changes when main's max-width/padding escape
  // works. panelWidth is grid-auto-columns: 100vw so always self-reports
  // 100vw regardless of whether the scroll container (.hub) is clipped
  // by main's max-width and padding, and is NOT a useful signal.
  const delta = Math.abs((data.hubWidth ?? 0) - vp.width);
  if (delta > 2) {
    console.error(`FAIL ${vp.width}x${vp.height}: hub width ${data.hubWidth} ≠ viewport ${vp.width} (Δ=${delta}; main padding ${data.mainPaddingLeft}/${data.mainPaddingRight})`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
