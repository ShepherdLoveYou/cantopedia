import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await ctx.route('**/*', (r) => {
  const h = { ...r.request().headers(), 'cache-control': 'no-cache, no-store', 'pragma': 'no-cache' };
  r.continue({ headers: h });
});

const dump = async (label) => {
  const d = await p.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      darkSide: html.classList.contains('dark-side'),
      htmlBg: getComputedStyle(html).backgroundColor,
      bodyBg: getComputedStyle(body).backgroundColor,
      mainBg: (() => { const m = document.querySelector('main'); return m ? getComputedStyle(m).backgroundColor : null; })(),
      vars: {
        '--t-bg': getComputedStyle(html).getPropertyValue('--t-bg').trim(),
        '--body-background': getComputedStyle(html).getPropertyValue('--body-background').trim(),
        '--t-ink': getComputedStyle(html).getPropertyValue('--t-ink').trim(),
        '--body-color': getComputedStyle(html).getPropertyValue('--body-color').trim(),
      },
      hubTiles: Array.from(document.querySelectorAll('button[data-theme]')).map(b => ({
        theme: b.dataset.theme,
        pressed: b.getAttribute('aria-pressed'),
      })),
      navToggle: !!document.querySelector('[data-theme-toggle]'),
      localStorage: (() => { try { return localStorage.getItem('cantopedia-theme'); } catch { return null; } })(),
    };
  });
  return { label, ...d };
};

await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
const r1 = await dump('home-initial');

const darkTile = await p.$('button[data-theme="dark"]');
if (darkTile) {
  await darkTile.click();
  await p.waitForTimeout(300);
}
const r2 = await dump('home-after-click-dark-tile');

const dishLink = await p.$('a[href*="/dishes/"]');
if (dishLink) {
  await dishLink.click();
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
}
const r3 = await dump('dish-after-dark-nav');

const navBtn = await p.$('[data-theme-toggle]');
const r4 = navBtn ? await (async () => {
  await navBtn.click(); await p.waitForTimeout(300);
  return await dump('dish-after-nav-toggle-click');
})() : { label: 'dish-no-nav-toggle (FAIL: nav toggle missing)' };

await p.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
const r5 = await dump('applist-fresh');

console.log(JSON.stringify([r1, r2, r3, r4, r5], null, 2));
await browser.close();
