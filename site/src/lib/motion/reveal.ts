// Reveal highlight — pointer-tracked radial glow on .wp-tile / .reveal.
// Single responsibility. Sets --reveal-x / --reveal-y CSS vars on the
// hovered element; CSS does the visual via ::before radial-gradient.

const WIRED_KEY = '__motionRevealWired';

export function initReveal(): void {
  if ((document as any)[WIRED_KEY]) return;
  (document as any)[WIRED_KEY] = true;

  document.addEventListener('pointermove', (e) => {
    const tile = (e.target as Element | null)?.closest<HTMLElement>('.wp-tile, .reveal');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--reveal-x', `${e.clientX - r.left}px`);
    tile.style.setProperty('--reveal-y', `${e.clientY - r.top}px`);
    tile.classList.add('reveal-active');
  });

  document.addEventListener('pointerleave', (e) => {
    const tile = (e.target as Element | null)?.closest<HTMLElement>('.wp-tile, .reveal');
    if (tile) tile.classList.remove('reveal-active');
  }, true);
}
