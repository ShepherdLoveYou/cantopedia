import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out', 'sweep');
mkdirSync(OUT, { recursive: true });

async function findDevPort() {
  if (process.env.PORT) return process.env.PORT;
  for (let p = 4321; p <= 4329; p++) {
    try {
      const r = await fetch(`http://localhost:${p}/cantopedia/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(800),
      });
      if (r.status < 500) return String(p);
    } catch {}
  }
  throw new Error('No dev server found on ports 4321-4329');
}
const PORT = await findDevPort();
console.log(`Using dev server on port ${PORT}`);

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 667 },
];
const LOCALES = ['zh', 'yue', 'en'];

// Build routes per locale. Dish/ingredient/sauce IDs must exist.
const ROUTES = (loc, sampleDish, sampleIngredient, sampleSauce) => [
  { name: 'home',          path: `/${loc}` },
  { name: 'all',           path: `/${loc}/all` },
  { name: 'browse-noodle', path: `/${loc}/browse/noodle` },
  { name: 'browse-rice',   path: `/${loc}/browse/rice` },
  { name: 'browse-main',   path: `/${loc}/browse/main` },
  { name: 'dish',          path: `/${loc}/dishes/${sampleDish}` },
  { name: 'ingredient',    path: `/${loc}/ingredients/${sampleIngredient}` },
  { name: 'sauce',         path: `/${loc}/sauces/${sampleSauce}` },
  { name: 'search',        path: `/${loc}/search` },
  { name: '404',           path: `/${loc}/this-does-not-exist` },
];

// Resolve sample IDs from filesystem — data lives at repo-root/data/, two levels above site/scripts/
const dataRoot = resolve(__dirname, '..', '..', 'data');
const dishDir  = resolve(dataRoot, 'dishes');
const ingDir   = resolve(dataRoot, 'ingredients');
const sauceDir = resolve(dataRoot, 'sauces');

const firstId = (dir) => {
  try {
    const file = readdirSync(dir).find((f) => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'));
    return file ? file.replace(/\.(md|ya?ml)$/, '') : null;
  } catch { return null; }
};

const sampleDish       = firstId(dishDir);
const sampleIngredient = firstId(ingDir);
const sampleSauce      = firstId(sauceDir);
console.log('Sample IDs:', { sampleDish, sampleIngredient, sampleSauce });
if (!sampleDish || !sampleIngredient || !sampleSauce) {
  console.error('FAIL: could not resolve sample content IDs from filesystem');
  process.exit(2);
}

const browser = await chromium.launch();
const allErrors = [];
let count = 0;

for (const vp of VIEWPORTS) {
  for (const loc of LOCALES) {
    for (const route of ROUTES(loc, sampleDish, sampleIngredient, sampleSauce)) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const pageErrors = [];
      // Some legitimate 404 navigations will console-error — only count REAL errors
      const expected404 = route.name === '404';
      page.on('pageerror', (e) => pageErrors.push({ kind: 'pageerror', msg: e.message }));
      page.on('console', (m) => {
        if (m.type() === 'error') {
          const text = m.text();
          // Filter out the 404 page's expected console noise if any
          if (!expected404) pageErrors.push({ kind: 'console', msg: text });
        }
      });
      try {
        await page.goto(`http://localhost:${PORT}/cantopedia${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        if (!expected404) pageErrors.push({ kind: 'goto', msg: e.message });
      }
      const fname = `${vp.name}-${loc}-${route.name}.png`;
      try {
        await page.screenshot({ path: resolve(OUT, fname), fullPage: true });
      } catch {}
      count++;
      if (pageErrors.length > 0) {
        allErrors.push({ vp: vp.name, locale: loc, route: route.name, errors: pageErrors });
      }
      await ctx.close();
    }
  }
}

writeFileSync(resolve(OUT, '..', 'sweep-errors.json'), JSON.stringify(allErrors, null, 2));
console.log(`Total screenshots: ${count}`);
console.log(`Total error events: ${allErrors.length}`);
if (allErrors.length > 0) {
  console.error('FAIL — errors detected. Full report:');
  console.error(JSON.stringify(allErrors.slice(0, 5), null, 2));
}
await browser.close();
process.exit(allErrors.length === 0 ? 0 : 1);
