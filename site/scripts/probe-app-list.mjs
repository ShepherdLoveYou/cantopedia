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
  await page.goto(`http://localhost:${PORT}/cantopedia/zh/all`, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll('.hub-panel'));
    const rows = Array.from(document.querySelectorAll('.app-list-row'));
    return {
      panelCount: panels.length,
      panelTypes: panels.map((p) => p.dataset.panel),
      rowCount: rows.length,
      firstRowName: rows[0]?.querySelector('.app-list-name')?.textContent,
      lastRowName: rows[rows.length - 1]?.querySelector('.app-list-name')?.textContent,
      letters: Array.from(document.querySelectorAll('.app-list-letter')).map((h) => h.textContent),
      pivotTitle: document.getElementById('hub-pivot-title')?.textContent,
      activePanel: panels.find((p) => p.dataset.panel === 'all')?.getBoundingClientRect().left,
    };
  });

  await page.screenshot({ path: resolve(OUT, 'app-list.png'), fullPage: true });
  writeFileSync(resolve(OUT, 'app-list.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (data.panelCount !== 10) { console.error(`FAIL: expected 10 panels, got ${data.panelCount}`); ok = false; }
  if (data.panelTypes[1] !== 'all') { console.error(`FAIL: panel index 1 should be 'all', got '${data.panelTypes[1]}'`); ok = false; }
  if (data.rowCount !== 66) { console.error(`FAIL: expected 66 dish rows, got ${data.rowCount}`); ok = false; }
  if (Math.abs(data.activePanel ?? -999) > 5) { console.error(`FAIL: AppList panel not in view (left=${data.activePanel})`); ok = false; }
  if (!data.letters || data.letters.length < 5) { console.error(`FAIL: section headers missing (got ${data.letters?.length})`); ok = false; }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
