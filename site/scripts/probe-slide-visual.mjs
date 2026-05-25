// Slow down the slide animation to 3s and capture frames mid-motion.
// This proves the slide is visually a proper parallel card-swipe.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';
const OUT = './probe-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

// Inject CSS that slows the slide animation to 3 seconds
await page.addInitScript(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = `
      html.nav-next::view-transition-old(root),
      html.nav-next::view-transition-new(root),
      html.nav-prev::view-transition-old(root),
      html.nav-prev::view-transition-new(root) {
        animation-duration: 3000ms !important;
      }
    `;
    document.head.appendChild(s);
  });
});

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.screenshot({ path: `${OUT}/slide-00-before.png`, fullPage: false });

const clickPromise = page.locator('.pivot[data-dir="next"]').click();

// Capture 6 frames at 500ms intervals (slowed to 3s, so 500/1000/1500/2000/2500/3000ms)
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/slide-${String(i).padStart(2,'0')}-frame${i*500}ms.png`, fullPage: false });
}

await clickPromise;
await page.screenshot({ path: `${OUT}/slide-99-after.png`, fullPage: false });

console.log('Slide frames saved to', OUT);
await browser.close();
