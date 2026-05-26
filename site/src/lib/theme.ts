/**
 * Theme state for Cantopedia.
 *
 * localStorage key: cantopedia-theme  : 'light' | 'dark'
 * SSR-safe + SPA-safe (callable from astro:page-load).
 */

export type Theme = 'light' | 'dark';

const THEME_KEY = 'cantopedia-theme';
const DEFAULT_THEME: Theme = 'dark';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function readTheme(): Theme {
  const v = safeGet(THEME_KEY);
  if (v === null || v === 'auto') return DEFAULT_THEME;
  return v === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark-side', theme === 'dark');
  safeSet(THEME_KEY, theme);
}

export function bootTheme(): void {
  applyTheme(readTheme());
}
