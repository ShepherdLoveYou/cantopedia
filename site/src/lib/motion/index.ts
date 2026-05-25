// Motion composition root — call initMotion() once per page load to wire
// all motion behaviors. Each module is independently idempotent, so this
// is safe to call repeatedly (e.g. on every astro:page-load).

import { initParallax } from './parallax';
import { initReveal } from './reveal';
import { initLiveTile } from './liveTile';

export function initMotion(): void {
  initParallax();
  initReveal();
  initLiveTile();
}
