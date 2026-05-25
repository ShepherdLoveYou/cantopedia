"""`pipeline fetch` — fetch license-clean source data for a dish.

v0.1-alpha scope: only Wikipedia (zh/en/yue) and Wikimedia Commons (image
search). USDA and HK gov terminology adapters are scaffolded but not run by
default. Synthesize / Claude API integration is gated by an env-var key.
"""

from __future__ import annotations

import sys

import click
from rich.console import Console

from pipeline.paths import DISHES_DIR
from pipeline.sources import wikipedia, wikimedia_commons
from pipeline.yaml_io import load_yaml

console = Console()


@click.group("fetch")
def fetch_cmd() -> None:
    """Fetch upstream source data into the local cache."""


@fetch_cmd.command("dish")
@click.argument("slug")
@click.option("--no-cache", is_flag=True, help="Force re-fetch even if cache exists.")
def fetch_dish(slug: str, no_cache: bool) -> None:
    """Fetch all available source data for one dish (by slug or menu_no)."""
    path = None
    for p in DISHES_DIR.glob("*.yaml"):
        raw = load_yaml(p)
        if raw and (raw.get("id") == slug or str(raw.get("menu_no")) == slug):
            path = p
            break
    if not path:
        console.print(f"[red]No dish found matching: {slug}[/red]")
        sys.exit(1)
    raw = load_yaml(path)
    en_name = raw["names"]["en"]
    yue_name = raw["names"]["yue_hant"]

    console.print(f"[bold]Fetching for dish #{raw['menu_no']}: {yue_name} ({en_name})[/bold]")

    wp_en = wikipedia.fetch_summary("en", en_name, use_cache=not no_cache)
    if wp_en:
        console.print(f"  [green]✓[/green] Wikipedia (en): {wp_en['title']} — {len(wp_en.get('extract', ''))} chars")
    else:
        console.print(f"  [yellow]–[/yellow] Wikipedia (en): no match for '{en_name}'")

    wp_zh = wikipedia.fetch_summary("zh", raw["names"]["zh"], use_cache=not no_cache)
    if wp_zh:
        console.print(f"  [green]✓[/green] Wikipedia (zh): {wp_zh['title']}")
    else:
        console.print(f"  [yellow]–[/yellow] Wikipedia (zh): no match")

    imgs = wikimedia_commons.search_images(en_name, limit=5, use_cache=not no_cache)
    console.print(f"  [green]✓[/green] Wikimedia Commons: {len(imgs)} image candidates")
    for img in imgs[:3]:
        console.print(f"      · {img['title']} ({img.get('license', 'unknown license')})")


@fetch_cmd.command("all")
@click.option("--limit", default=66, help="Max dishes to process.")
def fetch_all(limit: int) -> None:
    """Fetch sources for every dish (use sparingly — many network calls)."""
    paths = sorted(DISHES_DIR.glob("*.yaml"))[:limit]
    console.print(f"[bold]Fetching {len(paths)} dishes...[/bold]")
    for p in paths:
        raw = load_yaml(p)
        if not raw:
            continue
        console.rule(f"#{raw['menu_no']} {raw['names']['yue_hant']}")
        fetch_dish.callback(raw["id"], no_cache=False)


# Pydantic ImageMeta.license is a strict Literal — map Commons' free-form
# license strings to the allowed values.
_LICENSE_MAP = {
    "CC0": "CC0", "CC0-1.0": "CC0", "Public domain": "Public-Domain",
    "CC BY 2.0": "CC-BY-2.0", "CC-BY-2.0": "CC-BY-2.0",
    "CC BY 3.0": "CC-BY-3.0", "CC-BY-3.0": "CC-BY-3.0",
    "CC BY 4.0": "CC-BY-4.0", "CC-BY-4.0": "CC-BY-4.0",
    "CC BY-SA 2.0": "CC-BY-SA-2.0", "CC-BY-SA-2.0": "CC-BY-SA-2.0",
    "CC BY-SA 3.0": "CC-BY-SA-3.0", "CC-BY-SA-3.0": "CC-BY-SA-3.0",
    "CC BY-SA 4.0": "CC-BY-SA-4.0", "CC-BY-SA-4.0": "CC-BY-SA-4.0",
}


def _normalize_license(raw: str) -> str | None:
    """Return the schema-valid License literal, or None if not recognized."""
    return _LICENSE_MAP.get(raw.strip())


def _strip_html(s: str) -> str:
    """Crude tag-strip for Commons credit/artist HTML."""
    import re
    s = re.sub(r"<[^>]+>", "", s or "")
    return re.sub(r"\s+", " ", s).strip()


@fetch_cmd.command("attach-images")
@click.option("--limit", default=66, help="Max dishes to process.")
@click.option("--overwrite", is_flag=True, help="Replace existing images list.")
@click.option("--no-cache", is_flag=True, help="Force re-fetch from Commons.")
def attach_images(limit: int, overwrite: bool, no_cache: bool) -> None:
    """For each dish, attach the top CC-licensed Wikimedia Commons hit.

    Writes `images: [{path, source_id, license, credit}]` to each dish YAML.
    Skips dishes that already have an `images` block unless --overwrite.
    """
    from pipeline.yaml_io import dump_yaml

    paths = sorted(DISHES_DIR.glob("*.yaml"))[:limit]
    attached, skipped, no_match = 0, 0, 0
    for p in paths:
        raw = load_yaml(p)
        if not raw:
            continue
        if raw.get("images") and not overwrite:
            skipped += 1
            continue
        en_name = raw["names"]["en"]
        hits = wikimedia_commons.search_images(en_name, limit=8, use_cache=not no_cache)
        # Require a meaningful name overlap with the image title: at least
        # 2 of the dish's keywords (or its primary noun) appear in the title.
        # This filters out e.g. "Shrimp Fried Rice" -> shrimp sandwich.
        import re
        stop = {"of", "the", "with", "and", "in", "a", "to", "rice", "noodle",
                "noodles", "soup", "sauce", "fried", "stir", "deluxe", "style",
                "day"}
        name_words = [w.lower() for w in re.findall(r"[A-Za-z]+", en_name)]
        keywords = [w for w in name_words if w not in stop and len(w) > 2]
        primary = name_words[-1] if name_words else ""

        def matches(title: str) -> bool:
            tw = set(re.findall(r"[a-z]+", title.lower()))
            overlap = sum(1 for k in keywords if k in tw)
            return overlap >= 2 or (primary in tw and overlap >= 1)

        chosen = None
        for h in hits:
            lic = _normalize_license(h.get("license", ""))
            if not lic:
                continue
            if not matches(h.get("title", "")):
                continue
            chosen = (h, lic)
            break
        if not chosen:
            console.print(f"  [yellow]–[/yellow] #{raw['menu_no']:>2} {en_name}: no CC-licensed match")
            no_match += 1
            continue
        h, lic = chosen
        credit = _strip_html(h.get("artist") or h.get("credit") or "Wikimedia Commons contributor")
        # Truncate noisy artist HTML to ~140 chars
        credit = credit[:140].rstrip()
        raw["images"] = [{
            "path": h["url"],
            "source_id": "wikimedia-commons",
            "license": lic,
            "credit": credit,
        }]
        dump_yaml(raw, p)
        console.print(f"  [green]✓[/green] #{raw['menu_no']:>2} {en_name} → {lic} · {h['title'][:60]}")
        attached += 1

    console.print()
    console.print(f"[bold]Attached: {attached}  Skipped: {skipped}  No match: {no_match}[/bold]")
