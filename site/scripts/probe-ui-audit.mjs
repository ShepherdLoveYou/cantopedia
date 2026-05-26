import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = 'http://localhost:4321/cantopedia';
const ORIGIN = 'http://localhost:4321';
const OUT = resolve('audit-output');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const PAGES_BY_LOCALE = (locale) => [
  { name: 'home',           path: `/${locale}` },
  { name: 'search-empty',   path: `/${locale}/search` },
  { name: 'search-results', path: `/${locale}/search?q=chicken` },
  { name: 'notfound',       path: `/${locale}/this-page-does-not-exist` },
];

const toUrl = (relOrPath) => {
  if (relOrPath.startsWith('http')) return relOrPath;
  if (relOrPath.startsWith('/cantopedia')) return ORIGIN + relOrPath;
  if (relOrPath.startsWith('/')) return BASE + relOrPath;
  return BASE + '/' + relOrPath;
};

const browser = await chromium.launch();
const findings = [];

for (const vp of VIEWPORTS) {
  for (const locale of ['zh', 'en', 'yue']) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();
    const consoleErrors = [];
    const netFails = [];
    p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    p.on('response', (r) => { if (r.status() >= 400) netFails.push({ url: r.url(), status: r.status() }); });

    // Resolve a sample dish + category once per (vp, locale) by reading any link on home
    try {
      await p.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      findings.push({ vp: vp.name, locale, page: 'home-bootstrap', error: String(e) });
      await ctx.close();
      continue;
    }
    const sampleDish = await p.$eval('a[href*="/dishes/"]', a => a.getAttribute('href')).catch(() => null);
    const sampleCat  = await p.$eval('a[href*="/categories/"]', a => a.getAttribute('href')).catch(() => null);

    const targets = [
      ...PAGES_BY_LOCALE(locale),
      ...(sampleDish ? [{ name: 'dish-detail', path: sampleDish }] : []),
      ...(sampleCat  ? [{ name: 'category',    path: sampleCat  }] : []),
    ];

    for (const t of targets) {
      consoleErrors.length = 0;
      netFails.length = 0;
      const url = toUrl(t.path);
      try {
        await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await p.waitForTimeout(300);
      } catch (e) {
        findings.push({ vp: vp.name, locale, page: t.name, url, error: String(e) });
        continue;
      }
      const overflow = await p.evaluate(() => document.body.scrollWidth > window.innerWidth);
      const overflowAmount = await p.evaluate(() => document.body.scrollWidth - window.innerWidth);
      const shotPath = `${OUT}/${vp.name}_${locale}_${t.name}.png`;
      await p.screenshot({ path: shotPath, fullPage: true });
      findings.push({
        vp: vp.name,
        locale,
        page: t.name,
        url,
        screenshot: shotPath,
        consoleErrors: [...consoleErrors],
        netFails: [...netFails],
        horizontalOverflow: overflow,
        overflowAmountPx: overflowAmount,
      });
    }
    await ctx.close();
  }
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(`Wrote ${findings.length} findings to ${OUT}/findings.json`);
console.log(`Screenshots in ${OUT}/`);
await browser.close();
