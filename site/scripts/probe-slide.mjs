// Capture frames during pivot nav to visually check the slide.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';
const OUT = './probe-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Snap baseline
await page.screenshot({ path: `${OUT}/00-before.png`, fullPage: false });

// Start nav by clicking next pivot
const next = page.locator('.pivot[data-dir="next"]');
const clickPromise = next.click();

// Capture 6 frames over 600ms
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2,'0')}-frame${i*100}ms.png`, fullPage: false });
}

await clickPromise;
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/99-after.png`, fullPage: false });

console.log('Frames saved to', OUT);
await browser.close();
