import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const URL = `http://localhost:${PORT}/cantopedia/zh`;

const browser = await chromium.launch();
let ok = true;

try {
  // Fresh context = empty localStorage.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => ({
    htmlClasses: document.documentElement.className,
    dataAccent: document.documentElement.getAttribute('data-accent'),
    storedTheme: localStorage.getItem('cantopedia-theme'),
    storedAccent: localStorage.getItem('cantopedia-accent'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));

  await page.screenshot({ path: resolve(OUT, 'dark-default.png'), fullPage: false });
  writeFileSync(resolve(OUT, 'dark-default.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  if (!data.htmlClasses.includes('dark-side')) {
    console.error(`FAIL: <html> missing 'dark-side' class on fresh visit. classes="${data.htmlClasses}"`);
    ok = false;
  }
  if (data.dataAccent !== 'cobalt') {
    console.error(`FAIL: data-accent expected 'cobalt', got '${data.dataAccent}'`);
    ok = false;
  }
  if (data.storedTheme !== 'dark') {
    console.error(`FAIL: localStorage cantopedia-theme expected 'dark', got '${data.storedTheme}'`);
    ok = false;
  }
  if (data.accentVar !== '#3E65FF') {
    console.error(`FAIL: --accent computed value expected '#3E65FF', got '${data.accentVar}'`);
    ok = false;
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
