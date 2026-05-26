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
const errors = [];
const out = {};

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'dark') document.documentElement.classList.add('dark-side');
    else document.documentElement.classList.remove('dark-side');
    try { localStorage.setItem('cantopedia-theme', t); } catch (e) {}
  }, theme);
  await page.waitForTimeout(120);
}

async function diag(page) {
  return await page.evaluate(() => {
    const nav = document.querySelector('.metro-nav.app-bar');
    const ham = document.querySelector('.metro-nav .hamburger');
    const dropdown = document.querySelector('.metro-nav .app-bar-menu');
    const tabs = [...document.querySelectorAll('.metro-nav .pivot-tab')].map((a) => ({
      loc: a.getAttribute('data-loc'),
      active: a.classList.contains('active'),
      opacity: getComputedStyle(a).opacity,
      href: a.getAttribute('href'),
    }));
    const csNav = nav ? getComputedStyle(nav) : null;
    return {
      navBg: csNav?.backgroundColor,
      navColor: csNav?.color,
      navHeight: nav?.getBoundingClientRect().height,
      hamExists: !!ham,
      dropdownExists: !!dropdown,
      tabs,
    };
  });
}

try {
  // ---- 1) Multi-page light @ 414px
  out.lightMobile = {};
  const pages = [
    { name: 'home-zh', url: `${BASE}/zh` },
    { name: 'home-en', url: `${BASE}/en` },
    { name: 'browse-dim-sum', url: `${BASE}/zh/browse/dim-sum` },
    { name: 'all', url: `${BASE}/zh/all` },
  ];
  for (const p of pages) {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push({ page: p.name, theme: 'light', err: e.message }));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({ page: p.name, theme: 'light', cons: m.text() }); });
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await setTheme(page, 'light');
    out.lightMobile[p.name] = await diag(page);
    await page.screenshot({ path: resolve(OUT, `smoke-light-${p.name}.png`), clip: { x: 0, y: 0, width: 414, height: 100 } });
    await ctx.close();
  }

  // ---- 2) Same pages dark @ 414px
  out.darkMobile = {};
  for (const p of pages) {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push({ page: p.name, theme: 'dark', err: e.message }));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({ page: p.name, theme: 'dark', cons: m.text() }); });
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await setTheme(page, 'dark');
    out.darkMobile[p.name] = await diag(page);
    await page.screenshot({ path: resolve(OUT, `smoke-dark-${p.name}.png`), clip: { x: 0, y: 0, width: 414, height: 100 } });
    await ctx.close();
  }

  // ---- 3) Locale switching still works (SPA-swap behavior)
  out.localeSwitch = {};
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push({ scenario: 'localeSwitch', err: e.message }));
    await page.goto(`${BASE}/zh/browse/dim-sum`, { waitUntil: 'networkidle' });
    await setTheme(page, 'light');
    // Click EN
    await page.click('.metro-nav .pivot-tab[data-loc="en"]');
    await page.waitForTimeout(600);
    out.localeSwitch.afterEn = {
      url: page.url(),
      activeTab: await page.evaluate(() => document.querySelector('.metro-nav .pivot-tab.active')?.getAttribute('data-loc')),
    };
    // Click 粵
    await page.click('.metro-nav .pivot-tab[data-loc="yue"]');
    await page.waitForTimeout(600);
    out.localeSwitch.afterYue = {
      url: page.url(),
      activeTab: await page.evaluate(() => document.querySelector('.metro-nav .pivot-tab.active')?.getAttribute('data-loc')),
    };
    await ctx.close();
  }

  // ---- 4) More menu (⋮) still works
  out.moreMenu = {};
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push({ scenario: 'moreMenu', err: e.message }));
    await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
    await setTheme(page, 'light');
    await page.click('[data-appbar="more"]');
    await page.waitForTimeout(400);
    out.moreMenu.afterOpen = await page.evaluate(() => {
      const m = document.getElementById('appbar-more-menu');
      return {
        ariaHidden: m?.getAttribute('aria-hidden'),
        triggerExpanded: document.querySelector('[data-appbar="more"]')?.getAttribute('aria-expanded'),
        hasSwatches: !!m?.querySelector('[data-accent-swatch]'),
      };
    });
    // Click red accent
    await page.click('[data-accent-swatch="red"]');
    await page.waitForTimeout(120);
    out.moreMenu.afterAccent = await page.evaluate(() => ({
      dataAccent: document.documentElement.getAttribute('data-accent'),
      accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    }));
    // Esc close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    out.moreMenu.afterClose = await page.evaluate(() => document.getElementById('appbar-more-menu')?.getAttribute('aria-hidden'));
    await page.screenshot({ path: resolve(OUT, 'smoke-more-menu.png') });
    await ctx.close();
  }

  // ---- 5) Wider viewport sanity
  out.desktop = {};
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push({ scenario: 'desktop', err: e.message }));
    await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle' });
    await setTheme(page, 'light');
    out.desktop.light = await diag(page);
    await page.screenshot({ path: resolve(OUT, 'smoke-desktop-light.png'), clip: { x: 0, y: 0, width: 1280, height: 80 } });
    await setTheme(page, 'dark');
    out.desktop.dark = await diag(page);
    await page.screenshot({ path: resolve(OUT, 'smoke-desktop-dark.png'), clip: { x: 0, y: 0, width: 1280, height: 80 } });
    await ctx.close();
  }

  writeFileSync(resolve(OUT, 'nav-smoke.json'), JSON.stringify({ out, errors }, null, 2));
  console.log('--- SUMMARY ---');
  console.log('errors:', JSON.stringify(errors, null, 2));
  console.log('locale-switch:', JSON.stringify(out.localeSwitch, null, 2));
  console.log('more-menu:', JSON.stringify(out.moreMenu, null, 2));
  const allChecks = [
    ...Object.values(out.lightMobile).map((d) => ({ key: 'lightMobile', d })),
    ...Object.values(out.darkMobile).map((d) => ({ key: 'darkMobile', d })),
    { key: 'desktop.light', d: out.desktop.light },
    { key: 'desktop.dark', d: out.desktop.dark },
  ];
  for (const c of allChecks) {
    if (c.d.hamExists || c.d.dropdownExists) console.log(`FAIL: ${c.key} still has hamburger/dropdown`);
  }
} finally {
  await browser.close();
}
