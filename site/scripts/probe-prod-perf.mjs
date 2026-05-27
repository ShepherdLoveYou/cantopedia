import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const URL = 'https://shepherdloveyou.github.io/cantopedia/zh';

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const navStart = Date.now();
  await page.goto(URL + '?_=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  const loadEnd = Date.now();
  await page.waitForLoadState('networkidle');

  // Confirm Metro is gone.
  const metroCheck = await page.evaluate(() => {
    const cssLinks = [...document.styleSheets].map((s) => s.href).filter(Boolean);
    const metroCssLoaded = cssLinks.some((u) => u && u.includes('metro'));
    const metroIconsLoaded = cssLinks.some((u) => u && u.includes('icon'));
    const win = window;
    return {
      metroGlobal: typeof win.Metro,
      metroCssLoaded,
      metroIconsLoaded,
      svgCount: document.querySelectorAll('svg').length,
      utilSvgCount: document.querySelectorAll('.util-tile svg').length,
      themeBtnSvg: !!document.querySelector('.metro-nav-theme-btn svg'),
      dataRoleTile: document.querySelectorAll('[data-role="tile"]').length,
    };
  });

  const navTiming = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    return {
      domInteractive: Math.round(t.domInteractive),
      domComplete: Math.round(t.domComplete),
      paints: Object.fromEntries(paints.map((p) => [p.name, Math.round(p.startTime)])),
    };
  });

  const lcp = await page.evaluate(() => new Promise((res) => {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      res(Math.round(last.startTime));
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res(null), 1500);
  }));

  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((r) => ({
      url: r.name,
      type: r.initiatorType,
      encoded: r.encodedBodySize,
    }));
  });
  const css = resources.filter((r) => r.url.endsWith('.css') || r.url.includes('.css?'));
  const js = resources.filter((r) => r.url.endsWith('.js') || (r.url.includes('.js?') && r.type === 'script'));
  const cssTotal = Math.round(css.reduce((s, r) => s + (r.encoded || 0), 0) / 1024);
  const jsTotal = Math.round(js.reduce((s, r) => s + (r.encoded || 0), 0) / 1024);

  const longTasks = await page.evaluate(() => new Promise((res) => {
    const tasks = [];
    const obs = new PerformanceObserver((list) => {
      for (const t of list.getEntries()) tasks.push({ duration: Math.round(t.duration) });
    });
    try { obs.observe({ type: 'longtask', buffered: true }); } catch (e) {}
    setTimeout(() => { obs.disconnect(); res(tasks); }, 500);
  }));

  const report = {
    metroCheck,
    timing: { goto_to_load: loadEnd - navStart, domInteractive: navTiming.domInteractive, domComplete: navTiming.domComplete },
    paints: navTiming.paints,
    lcp,
    bundles: { cssTotalKB: cssTotal, cssCount: css.length, jsTotalKB: jsTotal, jsCount: js.length },
    longTasks: { count: longTasks.length, totalMs: longTasks.reduce((a, t) => a + t.duration, 0), maxMs: Math.max(0, ...longTasks.map((t) => t.duration)) },
  };
  writeFileSync(resolve(OUT, 'prod-perf-after.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
