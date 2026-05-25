/**
 * Wikimedia Commons stores files at
 *   https://upload.wikimedia.org/wikipedia/commons/<hashA>/<hashAB>/<file>
 *
 * Direct /thumb/ URLs with arbitrary widths (e.g. 600px-) are rejected
 * by Commons as of 2024: only specific per-file widths are allowed.
 * Use the Special:FilePath endpoint which 302-redirects to whatever
 * allowed thumb width is closest:
 *   https://commons.wikimedia.org/wiki/Special:FilePath/<file>?width=N
 */
const COMMONS_RE =
  /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([a-f0-9])\/([a-f0-9]{2})\/(.+)$/;

export function commonsThumb(url: string, width = 600): string {
  const m = url.match(COMMONS_RE);
  if (!m) return url;
  const file = m[4].split('/').pop()!;
  // Special:FilePath accepts any ?width=N and redirects to a real thumb.
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${width}`;
}

/** Build a link back to the source Commons page from the file URL. */
export function commonsPageUrl(url: string): string {
  const m = url.match(COMMONS_RE);
  if (!m) return url;
  const file = m[4].split('/').pop()!;
  return `https://commons.wikimedia.org/wiki/File:${file}`;
}
