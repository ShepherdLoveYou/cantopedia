"""On-disk JSON cache for upstream API responses."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from pipeline.paths import CACHE_DIR

DEFAULT_TTL_DAYS = 30


def _cache_path(source: str, key: str) -> "Path":
    from pathlib import Path
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    safe = "".join(c if c.isalnum() else "_" for c in key)[:60]
    return CACHE_DIR / source / f"{safe}_{h}.json"


def load(source: str, key: str, ttl_days: int = DEFAULT_TTL_DAYS) -> Any | None:
    """Return cached entry if fresh, else None."""
    p = _cache_path(source, key)
    if not p.exists():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    ts = data.get("__cached_at")
    if not ts:
        return None
    try:
        cached_at = datetime.fromisoformat(ts)
    except ValueError:
        return None
    if datetime.now(timezone.utc) - cached_at > timedelta(days=ttl_days):
        return None
    return data.get("payload")


def store(source: str, key: str, payload: Any) -> None:
    p = _cache_path(source, key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(
            {"__cached_at": datetime.now(timezone.utc).isoformat(), "payload": payload},
            ensure_ascii=False, indent=2,
        ),
        encoding="utf-8",
    )
