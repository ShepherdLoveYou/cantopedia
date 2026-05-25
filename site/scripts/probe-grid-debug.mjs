import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

const data = await p.evaluate(() => {
  const grid = document.querySelector('.tiles-grid.start-tiles');
  const panel = document.querySelector('.hub-panel--home');
  const hub = document.getElementById('hub');
  const main = document.querySelector('main');
  const cs = getComputedStyle(grid);
  const hubCs = getComputedStyle(hub);
  return {
    hub: {
      w: Math.round(hub.getBoundingClientRect().width),
      h: Math.round(hub.getBoundingClientRect().height),
      display: hubCs.display,
      gridAutoFlow: hubCs.gridAutoFlow,
      gridAutoColumns: hubCs.gridAutoColumns,
      width: hubCs.width,
    },
    grid: {
      w: Math.round(grid.getBoundingClientRect().width),
      h: Math.round(grid.getBoundingClientRect().height),
      display: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns,
      gridAutoRows: cs.gridAutoRows,
      gap: cs.gap,
      padding: cs.padding,
    },
    panel: {
      w: Math.round(panel.getBoundingClientRect().width),
      h: Math.round(panel.getBoundingClientRect().height),
      overflow: getComputedStyle(panel).overflow,
      width: getComputedStyle(panel).width,
    },
    main: {
      w: Math.round(main.getBoundingClientRect().width),
      maxWidth: getComputedStyle(main).maxWidth,
    },
  };
});
console.log(JSON.stringify(data, null, 2));
await p.screenshot({ path: resolve(OUT, 'grid-debug-full.png'), fullPage: false });
await browser.close();
