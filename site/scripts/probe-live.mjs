// Dump full animation state mid-transition: target, computed style.

import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE ?? 'https://shepherdloveyou.github.io/cantopedia';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const page = await ctx.newPage();

await page.goto(BASE + '/zh/browse/rice', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const result = await page.evaluate(async () => {
  // Listen for the transition start, then sample at 100ms
  return new Promise((resolve) => {
    const origStart = document.startViewTransition?.bind(document);
    if (!origStart) return resolve({ error: 'no VT API' });
    document.startViewTransition = (cb) => {
      const t = origStart(cb);
      t.ready.then(() => {
        // After ready, dump all VT-related animations + their computed property values
        setTimeout(() => {
          const dump = document.getAnimations().filter((a) => a.effect?.pseudoElement).map((a) => {
            const target = a.effect.target;
            // Try to find the pseudo's computed style via target.computedStyleMap or similar
            return {
              name: a.animationName,
              pseudo: a.effect.pseudoElement,
              targetTag: target?.tagName,
              duration: a.effect.getComputedTiming().duration,
              progress: a.effect.getComputedTiming().progress,
              easing: a.effect.getComputedTiming().easing,
              fill: a.effect.getComputedTiming().fill,
              playState: a.playState,
            };
          });
          resolve({ animations: dump, htmlClass: document.documentElement.className });
        }, 100);
      });
      return t;
    };
    setTimeout(() => {
      document.querySelector('.pivot[data-dir="next"]').click();
    }, 50);
  });
});

console.log('html.class:', result.htmlClass);
console.log('\nAnimations 100ms into transition:');
(result.animations || []).forEach((a) => {
  console.log(`  ${(a.name || '(unnamed)').padEnd(40)} ${a.pseudo?.padEnd(40)} duration=${a.duration}ms progress=${a.progress?.toFixed(2)} easing=${a.easing} fill=${a.fill} state=${a.playState}`);
});

await browser.close();
