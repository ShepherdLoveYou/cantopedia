// Measure paint timing + animation FPS during pivot slide.

import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const result = await page.evaluate(() => {
  return new Promise((resolve) => {
    let frameCount = 0;
    let lastT = performance.now();
    let frameDurations = [];
    let recording = false;

    function tick(t) {
      if (recording) {
        frameDurations.push(t - lastT);
        frameCount++;
      }
      lastT = t;
      if (frameCount < 80) requestAnimationFrame(tick);
      else resolve({ frameCount, frameDurations });
    }

    setTimeout(() => {
      recording = true;
      lastT = performance.now();
      requestAnimationFrame(tick);
      document.querySelector('.pivot[data-dir="next"]').click();
    }, 100);
  });
});

const longFrames = result.frameDurations.filter((d) => d > 20).length;
const max = Math.max(...result.frameDurations);
const avg = result.frameDurations.reduce((a, b) => a + b, 0) / result.frameDurations.length;
const p95 = [...result.frameDurations].sort((a, b) => a - b)[Math.floor(result.frameDurations.length * 0.95)];

console.log('Frames during slide window:', result.frameCount);
console.log('Mean frame:', avg.toFixed(1), 'ms');
console.log('p95 frame:', p95.toFixed(1), 'ms');
console.log('Max frame:', max.toFixed(1), 'ms (target <16.7ms for 60fps)');
console.log('Long frames (>20ms):', longFrames);

await browser.close();
