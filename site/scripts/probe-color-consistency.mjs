import { chromium } from 'playwright';

const BASE = 'http://localhost:4321/cantopedia';

// Expected accent hex per data-accent value (mirrors BaseLayout.astro :root[data-accent="..."] rules)
const ACCENT_HEX = {
  cobalt:  '#3E65FF',
  red:     '#E51400',
  orange:  '#FA6800',
  emerald: '#008A00',
};

const norm = (rgb) => {
  // rgb(R, G, B) → #RRGGBB uppercase
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return '#' + m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const setAccent = async (p, accent) => {
  await p.evaluate((a) => {
    document.documentElement.setAttribute('data-accent', a);
    try { localStorage.setItem('cantopedia-accent', a); } catch {}
  }, accent);
  await p.waitForTimeout(150);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();

const results = [];
const assert = (label, expected, actual) => {
  const ok = expected.toUpperCase() === actual.toUpperCase();
  results.push({ label, expected, actual, ok });
};

for (const accent of Object.keys(ACCENT_HEX)) {
  const want = ACCENT_HEX[accent];

  // Home page — assert footer stripe + a:hover-via-computed-style + pivot-tab.active::after
  await p.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
  await setAccent(p, accent);

  // Part 1.B — footer::before stripe background
  const footerStripeBg = await p.evaluate(() => {
    const el = document.querySelector('footer');
    if (!el) return null;
    return getComputedStyle(el, '::before').backgroundColor;
  });
  if (footerStripeBg) assert(`[${accent}] footer::before bg`, want, norm(footerStripeBg));

  // Part 2 — .pivot-tab.active::after background (top-bar active tab underline)
  const activeUnderlineBg = await p.evaluate(() => {
    const el = document.querySelector('.pivot-tab.active');
    if (!el) return null;
    return getComputedStyle(el, '::after').backgroundColor;
  });
  if (activeUnderlineBg) assert(`[${accent}] .pivot-tab.active::after bg`, want, norm(activeUnderlineBg));

  // Part 2 — a:hover color (read declared color from CSS rules, resolve via probe element)
  const aHoverColor = await p.evaluate(() => {
    const a = document.querySelector('main a, footer a');
    if (!a) return null;
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        if (rule.selectorText === 'a:hover' || rule.selectorText === 'footer a:hover') {
          const c = rule.style.color;
          if (c) return c;
        }
      }
    }
    return null;
  });
  if (aHoverColor) {
    const resolved = await p.evaluate((decl) => {
      const probe = document.createElement('span');
      probe.style.color = decl;
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, aHoverColor);
    assert(`[${accent}] a:hover color`, want, norm(resolved));
  }

  // Search page — assert .search-input:focus border-color (Part 1.A)
  await p.goto(`${BASE}/zh/search`, { waitUntil: 'networkidle' });
  await setAccent(p, accent);
  const input = await p.$('.search-input');
  if (input) {
    await input.focus();
    await p.waitForTimeout(150);
    const borderColor = await p.evaluate(() => {
      const el = document.querySelector('.search-input');
      return el ? getComputedStyle(el).borderColor : null;
    });
    if (borderColor) assert(`[${accent}] .search-input:focus border`, want, norm(borderColor));
  }
}

// Brand-fixed sanity: brand-seal should stay red regardless of accent
await p.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
await setAccent(p, 'cobalt');
const sealBg = await p.evaluate(() => {
  const el = document.querySelector('.brand-seal');
  return el ? getComputedStyle(el).backgroundColor : null;
});
if (sealBg) assert(`[cobalt] .brand-seal stays brand red`, '#E51400', norm(sealBg));

console.log(JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
