import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

await page.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });

const dump = async (label) => {
  return await page.evaluate((l) => ({
    label: l,
    darkSide: document.documentElement.classList.contains('dark-side'),
    lightPressed: document.querySelector('button[data-theme="light"]')?.getAttribute('aria-pressed'),
    darkPressed: document.querySelector('button[data-theme="dark"]')?.getAttribute('aria-pressed'),
    autoPresent: !!document.querySelector('button[data-theme="auto"], button[data-theme-choice="auto"]'),
  }), label);
};

const before = await dump('before');

await page.click('button[data-theme="dark"].util-tile');
await page.waitForTimeout(200);
const afterDark = await dump('after-click-dark');

await page.click('button[data-theme="light"].util-tile');
await page.waitForTimeout(200);
const afterLight = await dump('after-click-light');

let ok = true;
if (afterDark.darkSide !== true) { console.error('FAIL: clicking dark tile did not add .dark-side'); ok = false; }
if (afterDark.darkPressed !== 'true') { console.error('FAIL: dark tile aria-pressed not synced'); ok = false; }
if (afterLight.darkSide !== false) { console.error('FAIL: clicking light tile did not remove .dark-side'); ok = false; }
if (afterLight.lightPressed !== 'true') { console.error('FAIL: light tile aria-pressed not synced'); ok = false; }
if (afterDark.autoPresent) { console.error('FAIL: auto button still present (should be removed)'); ok = false; }

console.log(JSON.stringify({ before, afterDark, afterLight, pass: ok }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
