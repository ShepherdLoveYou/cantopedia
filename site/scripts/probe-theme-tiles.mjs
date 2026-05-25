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

  async function readTheme() {
    return await page.evaluate(() => ({
      dataTheme: document.documentElement.dataset.theme,
      dataChoice: document.documentElement.dataset.themeChoice,
      localStorage: localStorage.getItem('cantopedia-theme'),
    }));
  }

  const initial = await readTheme();

  await page.click('button[data-theme-choice="dark"].util-tile');
  await page.waitForTimeout(200);
  const afterDark = await readTheme();

  await page.click('button[data-theme-choice="light"].util-tile');
  await page.waitForTimeout(200);
  const afterLight = await readTheme();

  // Verify theme persists across nav
  const dishLink = await page.$('a[href*="/dishes/"]');
  if (dishLink) {
    await dishLink.click();
    await page.waitForLoadState('networkidle');
  }
  const afterNav = await readTheme();

  writeFileSync(resolve(OUT, 'theme-tiles.json'), JSON.stringify({ initial, afterDark, afterLight, afterNav }, null, 2));
  console.log(JSON.stringify({ initial, afterDark, afterLight, afterNav }, null, 2));

  if (afterDark.dataTheme !== 'dark') { console.error('FAIL: clicking dark tile did not set data-theme=dark'); ok = false; }
  if (afterLight.dataTheme !== 'light') { console.error('FAIL: clicking light tile did not set data-theme=light'); ok = false; }
  if (afterLight.localStorage !== 'light') { console.error('FAIL: localStorage not updated'); ok = false; }
  if (dishLink && afterNav.dataTheme !== 'light') { console.error('FAIL: theme did not persist across nav'); ok = false; }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
