// Contrast audit — snapshot every key surface in both themes
// and compute WCAG contrast on critical text/bg pairs.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';
const OUT = './contrast-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const issues = [];

function rgb(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(',').map((v) => parseFloat(v.trim()));
  return [r, g, b];
}
function lum([r, g, b]) {
  const sc = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * sc(r) + 0.7152 * sc(g) + 0.0722 * sc(b);
}
function contrast(a, b) {
  const la = lum(a);
  const lb = lum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

async function checkPair(label, fgSel, bgSel) {
  const fg = await page.locator(fgSel).first().evaluate((el) => getComputedStyle(el).color);
  const bg = await page.locator(bgSel).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const a = rgb(fg);
  let b = rgb(bg);
  // backgroundColor may be transparent — walk up until we find a real bg
  if (!b || (b[0] === 0 && b[1] === 0 && b[2] === 0 && bg.startsWith('rgba'))) {
    b = await page.locator(bgSel).first().evaluate((el) => {
      let n = el;
      while (n && n !== document.body) {
        const c = getComputedStyle(n).backgroundColor;
        if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    }).then(rgb);
  }
  if (!a || !b) {
    issues.push({ label, error: `parse fail fg=${fg} bg=${bg}` });
    return;
  }
  const c = contrast(a, b);
  const pass = c >= 4.5;
  console.log(`[${pass ? 'OK' : 'FAIL'}] ${label}: ${c.toFixed(2)} (fg=${fg} bg=${bg})`);
  if (!pass) issues.push({ label, ratio: c, fg, bg });
}

for (const theme of ['light', 'dark']) {
  console.log(`\n=== theme: ${theme} ===`);
  await page.addInitScript((t) => { localStorage.setItem('cantopedia-theme', t); }, theme);
  for (const locale of ['zh', 'en']) {
    console.log(`-- locale: ${locale} --`);
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, `home-${locale}-${theme}.png`), fullPage: false });

    await checkPair(`${locale}/${theme}/body`, 'h1', 'body');
    await checkPair(`${locale}/${theme}/meta-nav`, '.brand-name', '.metro-nav');
    await checkPair(`${locale}/${theme}/stat-label`, '.stat-label', '.stat-tile');

    // Open drawer
    await page.click('#hamburger');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `drawer-${locale}-${theme}.png`), fullPage: false });
    await checkPair(`${locale}/${theme}/drawer-cat`, '.drawer-cat-name', '.drawer-cat');
    await checkPair(`${locale}/${theme}/drawer-section`, '.drawer-section-label', '.nav-drawer');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

await browser.close();

writeFileSync(join(OUT, 'report.json'), JSON.stringify({ issues }, null, 2));
if (issues.length) {
  console.error(`\n${issues.length} contrast issue(s)`);
  process.exit(1);
}
console.log('\nALL CONTRASTS PASS');
