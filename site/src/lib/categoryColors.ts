/**
 * Single source of truth for the Metro / WP10 tile colors per category.
 *
 * `main` uses Metro steel (#647687) rather than near-black so the tile
 * stays visible against the dark-mode page background (#0e0e10).
 */
export const tileColors: Record<string, string> = {
  appetizer: '#e51400',     // Metro red
  'soup-wonton': '#2d89ef', // Metro blue
  rice: '#f09609',          // Metro orange
  noodle: '#008a00',        // Metro green
  'soup-noodle': '#00aba9', // Metro teal
  'baked-rice': '#a05000',  // Metro brown
  congee: '#9f00a7',        // Metro purple
  main: '#647687',          // Metro steel — visible in both light + dark
};

export const FALLBACK_COLOR = '#647687';

export function tileColor(catId: string): string {
  return tileColors[catId] ?? FALLBACK_COLOR;
}
