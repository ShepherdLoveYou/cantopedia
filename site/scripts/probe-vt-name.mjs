// Verify view-transition-name computed value before/during pivot nav.

import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

async function snapshot(label) {
  return await page.evaluate((l) => {
    const out = { label: l, cls: document.documentElement.className, items: [] };
    document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => {
      out.items.push({
        tag: el.tagName,
        cls: el.className,
        inlineStyle: el.style.viewTransitionName,
        computed: getComputedStyle(el).viewTransitionName,
      });
    });
    return out;
  }, label);
}

const before = await snapshot('before-click');
console.log('=== before click (html.cls="' + before.cls + '") ===');
before.items.forEach((i) => console.log(`  ${i.tag}.${i.cls.slice(0, 20)}  inline="${i.inlineStyle}" computed="${i.computed}"`));

// Add nav-next class manually and recompute
await page.evaluate(() => document.documentElement.classList.add('nav-next'));
const withClass = await snapshot('with-nav-next');
console.log('\n=== after manual html.classList.add("nav-next") ===');
withClass.items.forEach((i) => console.log(`  ${i.tag}.${i.cls.slice(0, 20)}  inline="${i.inlineStyle}" computed="${i.computed}"`));

await browser.close();
