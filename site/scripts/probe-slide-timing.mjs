// Sample the actual transform + opacity of view-transition pseudos
// across the slide to understand the perceived "sequential" feel.

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.__samples = [];
  window.__sampler = setInterval(() => {
    const anims = document.getAnimations()
      .filter((a) => a.animationName === 'slide-out-left' || a.animationName === 'slide-in-right' ||
                     a.animationName === 'slide-out-right' || a.animationName === 'slide-in-left' ||
                     a.animationName?.includes('view-transition'))
      .map((a) => ({
        name: a.animationName,
        pseudo: a.effect?.pseudoElement,
        time: Math.round(a.currentTime || 0),
        progress: a.effect?.getComputedTiming?.()?.progress ?? null,
        playState: a.playState,
      }));
    if (anims.length) window.__samples.push({ t: performance.now(), anims });
  }, 25);
});

await page.locator('.pivot[data-dir="next"]').click();
await page.waitForTimeout(1200);

const samples = await page.evaluate(() => { clearInterval(window.__sampler); return window.__samples; });
if (!samples.length) { console.log('NO SAMPLES'); }

// Print compact timeline: t | animation states
const start = samples[0]?.t ?? 0;
samples.forEach((s) => {
  const rel = (s.t - start).toFixed(0);
  const slides = s.anims.filter((a) => a.name.startsWith('slide-'));
  if (slides.length === 0) return;
  const lineParts = slides.map((a) => `${a.name}(t=${a.time}ms prog=${a.progress?.toFixed(2) ?? '?'} ${a.playState})`);
  console.log(`${rel.padStart(5)}ms | ${lineParts.join('  ')}`);
});

await browser.close();
