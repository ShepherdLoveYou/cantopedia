import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'probe-out');
mkdirSync(OUT, { recursive: true });

const PORT = process.env.PORT || '4321';
const BASE = `http://localhost:${PORT}/cantopedia`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();

  // Throttle CPU to simulate mid-range device.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // === 1. Initial load timing ===
  const navStart = Date.now();
  await page.goto(`${BASE}/zh`, { waitUntil: 'load' });
  const loadEnd = Date.now();
  const networkIdleStart = Date.now();
  await page.waitForLoadState('networkidle');
  const networkIdleEnd = Date.now();

  // === 2. Navigation Timing API ===
  const navTiming = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0];
    return t ? {
      dns: Math.round(t.domainLookupEnd - t.domainLookupStart),
      tcp: Math.round(t.connectEnd - t.connectStart),
      ttfb: Math.round(t.responseStart - t.requestStart),
      download: Math.round(t.responseEnd - t.responseStart),
      domInteractive: Math.round(t.domInteractive),
      domComplete: Math.round(t.domComplete),
      loadEvent: Math.round(t.loadEventEnd - t.loadEventStart),
    } : null;
  });

  // === 3. Paint timings ===
  const paintTiming = await page.evaluate(() => {
    const paints = performance.getEntriesByType('paint');
    return Object.fromEntries(paints.map((p) => [p.name, Math.round(p.startTime)]));
  });

  // === 4. Largest Contentful Paint ===
  const lcp = await page.evaluate(() => new Promise((res) => {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      res(Math.round(last.startTime));
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res(null), 1500);
  }));

  // === 5. Resource sizes ===
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((r) => ({
      name: r.name.split('/').slice(-1)[0].slice(0, 50),
      type: r.initiatorType,
      duration: Math.round(r.duration),
      size: r.transferSize,
      encoded: r.encodedBodySize,
      decoded: r.decodedBodySize,
    }));
  });
  const cssBundle = resources.filter((r) => r.name.endsWith('.css') || r.name.includes('.css?'));
  const jsBundle = resources.filter((r) => r.name.endsWith('.js') || r.name.includes('.js?') || r.type === 'script');
  const imgBundle = resources.filter((r) => r.type === 'img');
  const totalSize = (rs) => rs.reduce((sum, r) => sum + (r.encoded || 0), 0);
  const totalDecoded = (rs) => rs.reduce((sum, r) => sum + (r.decoded || 0), 0);

  // === 6. Scroll FPS ===
  // Scroll the page and measure frame drops.
  const fps = await page.evaluate(() => new Promise((res) => {
    const frames = [];
    let last = performance.now();
    function tick(now) {
      const delta = now - last;
      frames.push(delta);
      last = now;
      if (frames.length < 60) requestAnimationFrame(tick);
      else {
        const avgDelta = frames.reduce((a, b) => a + b, 0) / frames.length;
        const maxDelta = Math.max(...frames);
        const drops = frames.filter((d) => d > 20).length; // >20ms = below 50fps
        res({ avgFps: Math.round(1000 / avgDelta), worstFrame: Math.round(maxDelta), dropped: drops });
      }
    }
    // Trigger scroll while measuring.
    let scrollY = 0;
    const scrollI = setInterval(() => {
      scrollY += 30;
      window.scrollTo(0, scrollY);
      if (scrollY > 1200) clearInterval(scrollI);
    }, 16);
    requestAnimationFrame(tick);
  }));

  // === 7. JS heap size ===
  const heap = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeap: Math.round(performance.memory.usedJSHeapSize / 1048576),
        totalJSHeap: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      };
    }
    return null;
  });

  // === 8. Long tasks ===
  const longTasks = await page.evaluate(() => new Promise((res) => {
    const tasks = [];
    const obs = new PerformanceObserver((list) => {
      for (const t of list.getEntries()) tasks.push({ duration: Math.round(t.duration), startTime: Math.round(t.startTime) });
    });
    try { obs.observe({ type: 'longtask', buffered: true }); } catch (e) {}
    setTimeout(() => { obs.disconnect(); res(tasks); }, 500);
  }));

  const report = {
    timing: {
      goto_to_load: loadEnd - navStart,
      load_to_networkIdle: networkIdleEnd - networkIdleStart,
    },
    nav: navTiming,
    paint: paintTiming,
    lcp,
    bundles: {
      css: { count: cssBundle.length, totalKB: Math.round(totalSize(cssBundle) / 1024), decodedKB: Math.round(totalDecoded(cssBundle) / 1024), items: cssBundle.slice(0, 10).map(c => `${c.name} (${Math.round(c.encoded/1024)}KB enc / ${Math.round(c.decoded/1024)}KB dec)`) },
      js:  { count: jsBundle.length,  totalKB: Math.round(totalSize(jsBundle) / 1024),  decodedKB: Math.round(totalDecoded(jsBundle) / 1024),  items: jsBundle.slice(0, 12).map(c => `${c.name} (${Math.round(c.encoded/1024)}KB enc / ${Math.round(c.decoded/1024)}KB dec)`) },
      img: { count: imgBundle.length, totalKB: Math.round(totalSize(imgBundle) / 1024) },
    },
    scrollFps: fps,
    heap,
    longTasks: { count: longTasks.length, total_ms: longTasks.reduce((a, t) => a + t.duration, 0), max_ms: Math.max(0, ...longTasks.map(t => t.duration)) },
  };
  writeFileSync(resolve(OUT, 'perf-baseline.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
