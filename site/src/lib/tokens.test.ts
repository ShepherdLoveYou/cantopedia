import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..');

// Exact-match tokens for font-size. The test passes when the value contains
// any of these substrings. We deliberately do NOT allow bare "rem" or "em"
// here — that would defeat the guard. Functions like clamp() are allowed.
const ALLOWED_FONT_SIZE_PATTERNS = [
  // WP10 Mobile type ramp tokens
  'var(--fs-caption)', 'var(--fs-tiny)', 'var(--fs-body)', 'var(--fs-panel)',
  'var(--fs-title)', 'var(--fs-panorama-sm)', 'var(--fs-panorama)',
  // Lang-derived ramp (i18n overrides in BaseLayout)
  'var(--lang-h1-size)', 'var(--lang-h2-size)', 'var(--lang-h3-size)',
  // CSS functions and keywords
  'clamp(', 'inherit',
  // Special intentional values: 16px (body baseline), fixed icon sizes,
  // and the 8rem 404 display. Listed explicitly.
  '16px', '18px', '20px', '22px', '24px', '28px', '32px', '40px', '48px',
  '8rem',
  // The 0.875em on <code> is intentionally relative — keep as-is
  '0.875em',
];

const ALLOWED_FONT_WEIGHT_PATTERNS = [
  'var(--fw-light)', 'var(--fw-regular)', 'var(--fw-medium)',
  'var(--lang-min-weight', 'inherit', 'normal', 'bold', '600', '700',
];

function listFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    if (f.startsWith('node_modules')) continue;
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => f.endsWith(e))) out.push(p);
  }
  return out;
}

describe('design token discipline', () => {
  const files = listFiles(SRC, ['.astro', '.ts']);

  it('every font-size declaration uses a token (no hardcoded rem values)', () => {
    const violations: string[] = [];
    for (const f of files) {
      if (f.endsWith('tokens.test.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      const matches = content.matchAll(/font-size:\s*([^;]+);/g);
      for (const m of matches) {
        const value = m[1].trim();
        const isAllowed = ALLOWED_FONT_SIZE_PATTERNS.some((a) => value.includes(a));
        if (!isAllowed) {
          violations.push(`${f.replace(SRC + '/', '')}: font-size: ${value}`);
        }
      }
    }
    if (violations.length > 0) {
      console.error('Token violations:\n' + violations.join('\n'));
    }
    expect(violations).toEqual([]);
  });

  it('every font-weight uses a token (no hardcoded 200/300/400/500)', () => {
    const violations: string[] = [];
    for (const f of files) {
      if (f.endsWith('tokens.test.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      const matches = content.matchAll(/font-weight:\s*([^;]+);/g);
      for (const m of matches) {
        const value = m[1].trim();
        const isAllowed = ALLOWED_FONT_WEIGHT_PATTERNS.some((a) => value.includes(a));
        if (!isAllowed) {
          violations.push(`${f.replace(SRC + '/', '')}: font-weight: ${value}`);
        }
      }
    }
    if (violations.length > 0) {
      console.error('Token violations:\n' + violations.join('\n'));
    }
    expect(violations).toEqual([]);
  });
});
