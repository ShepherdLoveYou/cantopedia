import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const inspect = async (label) => {
  return await page.evaluate((l) => ({
    label: l,
    darkSide: document.documentElement.classList.contains('dark-side'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    ariaPressedLight: document.querySelector('button[data-theme="light"]')?.getAttribute('aria-pressed'),
    ariaPressedDark: document.querySelector('button[data-theme="dark"]')?.getAttribute('aria-pressed'),
    navToggle: !!document.querySelector('[data-theme-toggle]'),
  }), label);
};

const results = [];

await page.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
results.push(await inspect('home-initial'));

await page.click('button[data-theme="dark"]');
await page.waitForTimeout(200);
results.push(await inspect('home-after-click-dark'));

await page.click('button[data-theme="light"]');
await page.waitForTimeout(200);
results.push(await inspect('home-after-click-light'));

await page.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
results.push(await inspect('applist-fresh'));

await page.click('[data-theme-toggle]');
await page.waitForTimeout(200);
results.push(await inspect('applist-after-nav-toggle'));

await page.goto('http://localhost:4321/cantopedia/zh/dishes/001-ceoi3-pei4-zaai1-ceon1-gyun2', { waitUntil: 'networkidle' });
results.push(await inspect('dish-after-nav-toggle'));

console.log(JSON.stringify(results, null, 2));
await browser.close();
