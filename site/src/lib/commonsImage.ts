/**
 * Wikimedia Commons stores files at
 *   https://upload.wikimedia.org/wikipedia/commons/<hashA>/<hashAB>/<file>
 * and serves thumbnails (for bitmap files) at
 *   https://upload.wikimedia.org/wikipedia/commons/thumb/<hashA>/<hashAB>/<file>/<W>px-<file>
 *
 * Use commonsThumb(url, 600) to load a smaller variant. Falls back to the
 * original URL if the path doesn't match the Commons CDN layout.
 */
const COMMONS_RE =
  /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([a-f0-9])\/([a-f0-9]{2})\/(.+)$/;

export function commonsThumb(url: string, width = 600): string {
  const m = url.match(COMMONS_RE);
  if (!m) return url;
  const [, prefix, a, ab, file] = m;
  return `${prefix}/thumb/${a}/${ab}/${file}/${width}px-${file}`;
}

/** Build a link back to the source Commons page from the file URL. */
export function commonsPageUrl(url: string): string {
  const m = url.match(COMMONS_RE);
  if (!m) return url;
  const file = m[4].split('/').pop()!;
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
}
