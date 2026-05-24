"""`pipeline status` — show progress of dish enrichment."""

from __future__ import annotations

from collections import Counter

import click
from rich.console import Console
from rich.progress import BarColumn, Progress, TextColumn
from rich.table import Table

from pipeline.paths import DISHES_DIR, INGREDIENTS_DIR, SAUCES_DIR, SOURCES_DIR
from pipeline.yaml_io import load_yaml

console = Console()


@click.command("status")
def status_cmd() -> None:
    """Print stub/draft/complete progress for dishes."""
    statuses = Counter()
    by_cat: dict[str, Counter] = {}
    total = 0
    for path in sorted(DISHES_DIR.glob("*.yaml")):
        raw = load_yaml(path)
        if not raw:
            continue
        total += 1
        s = raw.get("method_status", "stub")
        statuses[s] += 1
        cat = raw.get("category", "unknown")
        by_cat.setdefault(cat, Counter())[s] += 1

    if total == 0:
        console.print("[yellow]No dishes found in data/dishes/[/yellow]")
        return

    console.print(f"\n[bold]Total dishes: {total}[/bold]\n")

    with Progress(
        TextColumn("[bold]{task.description}[/bold]"),
        BarColumn(bar_width=40),
        TextColumn("{task.fields[count]}"),
    ) as prog:
        prog.add_task("complete", total=total, completed=statuses["complete"], count=f"{statuses['complete']:>3}/{total}")
        prog.add_task("draft   ", total=total, completed=statuses["draft"], count=f"{statuses['draft']:>3}/{total}")
        prog.add_task("stub    ", total=total, completed=statuses["stub"], count=f"{statuses['stub']:>3}/{total}")

    console.print("\n[bold]Per-category breakdown:[/bold]")
    tbl = Table(show_header=True, header_style="bold")
    tbl.add_column("category")
    tbl.add_column("complete", justify="right")
    tbl.add_column("draft", justify="right")
    tbl.add_column("stub", justify="right")
    tbl.add_column("total", justify="right")
    for cat in sorted(by_cat):
        s = by_cat[cat]
        cat_total = sum(s.values())
        tbl.add_row(cat, str(s["complete"]), str(s["draft"]), str(s["stub"]), str(cat_total))
    console.print(tbl)

    n_ings = len(list(INGREDIENTS_DIR.glob("*.yaml")))
    n_sauces = len(list(SAUCES_DIR.glob("*.yaml")))
    n_sources = len(list(SOURCES_DIR.glob("*.yaml")))
    console.print(
        f"\n[bold]Other collections:[/bold] {n_ings} ingredients, {n_sauces} sauces, {n_sources} sources"
    )
