import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ORIGIN = 'http://localhost:4321';
const BASE = ORIGIN + '/cantopedia';
const OUT = resolve('audit-output/visual');
mkdirSync(OUT, { recursive: true });

const THEMES = ['light', 'dark'];
const ACCENTS = ['cobalt', 'red', 'orange', 'emerald'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const toUrl = (relOrPath) => {
  if (relOrPath.startsWith('http')) return relOrPath;
  if (relOrPath.startsWith('/cantopedia')) return ORIGIN + relOrPath;
  if (relOrPath.startsWith('/')) return BASE + relOrPath;
  return BASE + '/' + relOrPath;
};

const applyThemeAndAccent = async (p, theme, accent) => {
  await p.evaluate(({ t, a }) => {
    const html = document.documentElement;
    if (t === 'dark') html.classList.add('dark-side');
    else html.classList.remove('dark-side');
    html.setAttribute('data-accent', a);
    try {
      localStorage.setItem('cantopedia-theme', t);
      localStorage.setItem('cantopedia-accent', a);
    } catch {}
  }, { t: theme, a: accent });
  await p.waitForTimeout(200);
};

const browser = await chromium.launch();
const index = [];

// Discover dish-detail href once from home
const discoveryCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const discoveryPage = await discoveryCtx.newPage();
await discoveryPage.goto(`${BASE}/zh`, { waitUntil: 'networkidle', timeout: 15000 });
const dishHrefRaw = await discoveryPage.$eval('a[href*="/dishes/"]', a => a.getAttribute('href')).catch(() => null);
await discoveryCtx.close();

const DISH_PATH = dishHrefRaw || '/cantopedia/zh/dishes/054-ziu1-jim4-haa1';

const PAGES = [
  { name: 'home',           path: '/zh' },
  { name: 'search-empty',   path: '/zh/search' },
  { name: 'search-results', path: '/zh/search?q=chicken' },
  { name: 'dish-detail',    path: DISH_PATH },
  { name: 'category',       path: '/zh/browse/main' },
  { name: 'notfound',       path: '/zh/this-page-does-not-exist' },
];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const p = await ctx.newPage();
  for (const page of PAGES) {
    const url = toUrl(page.path);
    let navOk = true;
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      navOk = false;
    }
    await p.waitForTimeout(300);
    for (const theme of THEMES) {
      for (const accent of ACCENTS) {
        await applyThemeAndAccent(p, theme, accent);
        const file = `${theme}_${accent}_${vp.name}_${page.name}.png`;
        const out = `${OUT}/${file}`;
        await p.screenshot({ path: out, fullPage: true });
        index.push({
          theme, accent, viewport: vp.name, page: page.name,
          url, screenshot: file, navOk,
        });
      }
    }
  }
  await ctx.close();
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify(index, null, 2));
console.log(`Captured ${index.length} screenshots in ${OUT}/`);
console.log(`Index: ${OUT}/findings.json`);
await browser.close();
