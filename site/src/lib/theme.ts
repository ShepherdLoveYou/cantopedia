/**
 * Centralized theme + accent state for Cantopedia.
 *
 * Read-from / write-to localStorage with keys:
 *   cantopedia-theme  : 'light' | 'dark'
 *   cantopedia-accent : 'cobalt' | 'red' | 'orange' | 'emerald'
 *
 * SSR-safe: all functions guard against missing `window` / `localStorage`.
 * SPA-safe: callable from `astro:page-load` listeners after ClientRouter swap.
 *
 * The applyTheme/applyAccent functions also update aria-pressed on any
 * matching toggle controls — call them after the menu mounts.
 */

export type Theme = 'light' | 'dark';
export type Accent = 'cobalt' | 'red' | 'orange' | 'emerald';

const THEME_KEY = 'cantopedia-theme';
const ACCENT_KEY = 'cantopedia-accent';

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_ACCENT: Accent = 'cobalt';

const ACCENTS: ReadonlyArray<Accent> = ['cobalt', 'red', 'orange', 'emerald'];

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function readTheme(): Theme {
  const v = safeGet(THEME_KEY);
  // Legacy 'auto' migrates to dark (Phase F decision — see spec §5.1).
  if (v === null || v === 'auto') return DEFAULT_THEME;
  return v === 'light' ? 'light' : 'dark';
}

export function readAccent(): Accent {
  const v = safeGet(ACCENT_KEY);
  return (ACCENTS as ReadonlyArray<string>).includes(v ?? '') ? (v as Accent) : DEFAULT_ACCENT;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark-side', theme === 'dark');
  safeSet(THEME_KEY, theme);
  document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.theme === theme ? 'true' : 'false');
  });
}

export function applyAccent(accent: Accent): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', accent);
  safeSet(ACCENT_KEY, accent);
  document.querySelectorAll<HTMLButtonElement>('button[data-accent-swatch]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.accentSwatch === accent ? 'true' : 'false');
  });
}

export function toggleTheme(): Theme {
  const current = document.documentElement.classList.contains('dark-side') ? 'dark' : 'light';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Boot — call from inline head script (no FOIT) and again from astro:page-load. */
export function bootThemeAndAccent(): void {
  applyTheme(readTheme());
  applyAccent(readAccent());
}
