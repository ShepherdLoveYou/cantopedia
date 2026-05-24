"""Wikipedia REST API adapter.

Uses the public REST summary endpoint:
  https://<lang>.wikipedia.org/api/rest_v1/page/summary/<title>

License: Wikipedia content is CC BY-SA 4.0 — compatible with this project.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

from pipeline.sources import _cache

USER_AGENT = (
    "CantopediaPipeline/0.1 (https://github.com/ShepherdLoveYou/cantopedia; "
    "research; contact via GitHub issues)"
)


def fetch_summary(lang: str, title: str, use_cache: bool = True) -> dict[str, Any] | None:
    """Fetch Wikipedia page summary for given language and title."""
    if not title:
        return None
    cache_key = f"{lang}::{title}"
    if use_cache:
        cached = _cache.load("wikipedia", cache_key)
        if cached is not None:
            return cached

    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title)}"
    try:
        with httpx.Client(timeout=10.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(url)
        if resp.status_code == 404:
            _cache.store("wikipedia", cache_key, None)
            return None
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError:
        return None

    summary = {
        "title": data.get("title"),
        "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
        "extract": data.get("extract"),
        "description": data.get("description"),
        "language": lang,
        "license": "CC BY-SA 4.0",
    }
    _cache.store("wikipedia", cache_key, summary)
    return summary
