// Live tile flip — stagger animation-delay across .live-tile faces.
// Single responsibility. The actual flip animation is defined in CSS;
// this module only computes and applies the delay so adjacent tiles
// flip in turn rather than all at once.

export function initLiveTile(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tiles = document.querySelectorAll<HTMLElement>('.live-tile');
  tiles.forEach((tile, i) => {
    const delay = `${i * 1.8}s`;
    tile.querySelectorAll<HTMLElement>('.live-tile-face').forEach((face) => {
      face.style.animationDelay = delay;
    });
  });
}
