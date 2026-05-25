// Record video of pivot nav to actually see the slide.

import { chromium } from 'playwright';
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';
mkdirSync('./probe-out', { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'no-preference',
  recordVideo: { dir: './probe-out', size: { width: 1280, height: 800 } },
});
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(2000);

await ctx.close();
await browser.close();

// Rename the captured video
const files = readdirSync('./probe-out').filter((f) => f.endsWith('.webm'));
if (files.length) {
  renameSync(join('./probe-out', files[0]), join('./probe-out', 'pivot-slide.webm'));
  console.log('Video saved to probe-out/pivot-slide.webm');
} else {
  console.log('No video captured');
}
