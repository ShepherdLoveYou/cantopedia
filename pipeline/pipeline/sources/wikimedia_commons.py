"""Wikimedia Commons image-search adapter.

Uses the MediaWiki API on commons.wikimedia.org to find images by free-text
query. We restrict results to files with a recognised CC / public-domain
license string in their metadata.

License: file metadata from Commons is itself CC0; the underlying images
each carry their own (typically CC BY / CC BY-SA / public domain).
"""

from __future__ import annotations

from typing import Any

import httpx

from pipeline.sources import _cache

USER_AGENT = (
    "CantopediaPipeline/0.1 (https://github.com/ShepherdLoveYou/cantopedia; "
    "research; contact via GitHub issues)"
)


def search_images(query: str, limit: int = 5, use_cache: bool = True) -> list[dict[str, Any]]:
    """Search Wikimedia Commons for images matching the query."""
    if not query:
        return []
    cache_key = f"search::{query}::{limit}"
    if use_cache:
        cached = _cache.load("wikimedia_commons", cache_key)
        if cached is not None:
            return cached

    api = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrlimit": limit,
        "gsrnamespace": 6,  # File:
        "prop": "imageinfo|info",
        "iiprop": "url|extmetadata|mime",
        "iiextmetadatafilter": "License|LicenseShortName|Artist|Credit|ImageDescription",
    }
    try:
        with httpx.Client(timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(api, params=params)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError:
        return []

    pages = data.get("query", {}).get("pages", {})
    results: list[dict[str, Any]] = []
    for page in pages.values():
        title = page.get("title", "")
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        meta = info.get("extmetadata", {}) or {}
        lic = (meta.get("LicenseShortName") or {}).get("value", "")
        license_clean = lic.replace("CC0-1.0", "CC0").replace("CC BY-SA ", "CC-BY-SA-")
        results.append({
            "title": title,
            "url": info.get("url"),
            "mime": info.get("mime"),
            "license": license_clean or "unknown",
            "credit": (meta.get("Credit") or {}).get("value", ""),
            "artist": (meta.get("Artist") or {}).get("value", ""),
            "description": (meta.get("ImageDescription") or {}).get("value", ""),
        })

    _cache.store("wikimedia_commons", cache_key, results)
    return results
