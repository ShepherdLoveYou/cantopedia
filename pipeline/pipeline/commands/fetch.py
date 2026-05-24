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
