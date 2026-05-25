// Parallax — scroll-driven background translation for [data-parallax] targets.
// Single responsibility: only does parallax, nothing else. Idempotent and
// ClientRouter-safe — re-init after navigation is a no-op if nothing changed.

const WIRED_KEY = '__motionParallaxWired';

export function initParallax(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (targets.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const update = (): void => {
    const y = window.scrollY;
    targets.forEach((el) => {
      const rate = parseFloat(el.dataset.parallax ?? '0.4');
      const photo = el.querySelector<HTMLElement>('.hero-photo');
      if (photo) {
        photo.style.transform = `translate3d(0, ${y * rate}px, 0) scale(1.04)`;
      }
    });
    ticking = false;
  };

  const onScroll = (): void => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  if (!(window as any)[WIRED_KEY]) {
    window.addEventListener('scroll', onScroll, { passive: true });
    (window as any)[WIRED_KEY] = true;
  }
  update();
}
