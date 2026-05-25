// A11y deep checks via playwright + DOM probes.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const issues = [];
const ok = (id) => console.log('[ok]', id);
const fail = (id, msg) => { issues.push({ id, msg }); console.error('[FAIL]', id, msg); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Tab order on home — what's the first focusable element after page load?
await page.goto(BASE + '/zh', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.keyboard.press('Tab');
const focused1 = await page.evaluate(() => {
  const e = document.activeElement;
  return { tag: e?.tagName, id: e?.id, cls: e?.className, text: e?.textContent?.slice(0, 30) };
});
console.log('First Tab focus:', focused1);
if (focused1.id !== 'hamburger') {
  fail('tab_first', `first tab should focus #hamburger, got ${JSON.stringify(focused1)}`);
} else ok('tab_first_hamburger');

// 2. Drawer keyboard close via Escape
await page.click('#hamburger');
await page.waitForTimeout(400);
const drawerOpenBeforeEsc = await page.locator('.nav-drawer').evaluate((el) => el.classList.contains('open'));
if (!drawerOpenBeforeEsc) fail('drawer_open', 'drawer did not open on burger click');
else ok('drawer_open');

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const drawerClosedAfterEsc = await page.locator('.nav-drawer').evaluate((el) => !el.classList.contains('open'));
if (!drawerClosedAfterEsc) fail('drawer_esc_close', 'drawer did not close on Escape');
else ok('drawer_esc_close');

// 3. Drawer inert state when closed
const drawerInert = await page.locator('.nav-drawer').evaluate((el) => el.hasAttribute('inert'));
if (!drawerInert) fail('drawer_inert', 'closed drawer should have inert attribute');
else ok('drawer_inert');

// 4. Tab into hidden drawer should NOT reach drawer items
// First focus the burger
await page.locator('#hamburger').focus();
await page.keyboard.press('Tab');
const focusedAfterBurger = await page.evaluate(() => {
  const e = document.activeElement;
  // Should be the brand link or locale switcher (which is AFTER burger in source order), NOT a drawer link
  const insideDrawer = e?.closest?.('.nav-drawer') !== null;
  return { id: e?.id, cls: e?.className, insideDrawer };
});
if (focusedAfterBurger.insideDrawer) {
  fail('drawer_tab_escape', `tab from burger reached drawer item: ${JSON.stringify(focusedAfterBurger)}`);
} else ok('drawer_tab_escape');

// 5. All <img> have alt text
const imgsMissingAlt = await page.$$eval('img', (imgs) =>
  imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.outerHTML.slice(0, 100))
);
if (imgsMissingAlt.length) {
  fail('img_alt', `${imgsMissingAlt.length} <img> missing alt: ${imgsMissingAlt.slice(0, 3).join(' | ')}`);
} else ok('img_alt');

// 6. Buttons have accessible name (aria-label or text)
const btnsNoLabel = await page.$$eval('button', (btns) =>
  btns.filter((b) => !b.hasAttribute('aria-label') && !b.textContent?.trim()).map((b) => b.outerHTML.slice(0, 100))
);
if (btnsNoLabel.length) {
  fail('btn_label', `${btnsNoLabel.length} <button> without label: ${btnsNoLabel.slice(0, 3).join(' | ')}`);
} else ok('btn_label');

// 7. h1 exists exactly once per page
const h1Count = await page.locator('h1').count();
if (h1Count !== 1) fail('h1_count', `expected 1 <h1>, got ${h1Count}`);
else ok('h1_count');

// 8. lang attribute on html
const lang = await page.getAttribute('html', 'lang');
if (lang !== 'zh-Hant') fail('html_lang', `expected zh-Hant, got ${lang}`);
else ok('html_lang_zh');

// 9. dish page heading hierarchy
await page.goto(BASE + '/zh', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const dishLink = page.locator('a.wp-tile').first();
await dishLink.click();
await page.waitForTimeout(1500);
const dishH1 = await page.locator('h1').count();
if (dishH1 !== 1) fail('dish_h1', `dish page should have 1 <h1>, got ${dishH1}`);
else ok('dish_h1');

// 10. Reduced motion disables Ken Burns
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const heroPhoto = page.locator('.hero-photo.kb');
if (await heroPhoto.count() > 0) {
  const anim = await heroPhoto.first().evaluate((el) => getComputedStyle(el).animationName);
  if (anim !== 'none') fail('reduced_motion_kb', `Ken Burns still animating: ${anim}`);
  else ok('reduced_motion_kb');
} else {
  console.log('[skip] no hero-photo on this dish — likely a stub');
}

await browser.close();

if (issues.length) {
  console.error(`\n${issues.length} a11y issue(s):`);
  issues.forEach((i) => console.error('  -', i.id, ':', i.msg));
  process.exit(1);
}
console.log('\nA11Y OK');
