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
      dataTheme: html.dataset.theme,
      dataChoice: html.dataset.themeChoice,
      htmlBg: getComputedStyle(html).backgroundColor,
      bodyBg: getComputedStyle(body).backgroundColor,
      mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
      vars: {
        '--t-bg': getComputedStyle(html).getPropertyValue('--t-bg').trim(),
        '--body-background': getComputedStyle(html).getPropertyValue('--body-background').trim(),
        '--bg': getComputedStyle(html).getPropertyValue('--bg').trim(),
        '--ink': getComputedStyle(html).getPropertyValue('--ink').trim(),
      },
      // Check tile colors
      catTileFront: (() => {
        const f = document.querySelector('.cat-tile-v5 .slide--front');
        if (!f) return null;
        return getComputedStyle(f).color;
      })(),
      // Check toggle button presence
      themeButtons: Array.from(document.querySelectorAll('[data-theme-choice]')).map(b => ({
        choice: b.dataset.themeChoice,
        pressed: b.getAttribute('aria-pressed'),
      })),
    };
  });
  return { label, ...d };
};

// Pass 1: Home, initial (no localStorage)
await p.goto('http://localhost:4321/cantopedia/zh', { waitUntil: 'networkidle' });
const r1 = await dump('home-initial');

// Click dark
const darkBtn = await p.$('[data-theme-choice="dark"]');
if (darkBtn) {
  await darkBtn.click();
  await p.waitForTimeout(300);
}
const r2 = await dump('home-after-dark');

// Navigate to dish page
const dishLink = await p.$('a[href*="/dishes/"]');
if (dishLink) {
  await dishLink.click();
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
}
const r3 = await dump('dish-after-dark-nav');

// Click light from dish page (if button still visible) or navigate back
const lightBtn = await p.$('[data-theme-choice="light"]');
const r4 = lightBtn ? await (async () => {
  await lightBtn.click(); await p.waitForTimeout(300);
  return await dump('dish-after-light');
})() : { label: 'dish-no-light-btn (NO theme btn on dish page!)' };

// AppList page
await p.goto('http://localhost:4321/cantopedia/zh/all', { waitUntil: 'networkidle' });
const r5 = await dump('applist-fresh');

console.log(JSON.stringify([r1, r2, r3, r4, r5], null, 2));
await browser.close();
