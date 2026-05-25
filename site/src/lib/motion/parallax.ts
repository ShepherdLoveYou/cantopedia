// Parallax — scroll-driven background translation for [data-parallax] targets.
// Single responsibility. Idempotent and ClientRouter-safe — re-queries
// targets inside the scroll callback to avoid stale references after nav.

const WIRED_KEY = '__motionParallaxWired';

function applyParallax(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const y = window.scrollY;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const rate = parseFloat(el.dataset.parallax ?? '0.4');
    const photo = el.querySelector<HTMLElement>('.hero-photo');
    if (photo) {
      photo.style.translate = `0 ${y * rate}px 0`;
    }
  });
}

export function initParallax(): void {
  // Wire scroll listener once. The listener re-queries targets each tick.
  if (!(window as any)[WIRED_KEY]) {
    (window as any)[WIRED_KEY] = true;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => { applyParallax(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
  }
  // Always run once on init to set initial position (handles ClientRouter nav).
  applyParallax();
}
