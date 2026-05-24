"""`pipeline init` — generate stub dish + ingredient YAMLs from the transcription.

Idempotent: if a file already exists, the command skips it by default. Use
--force to overwrite.

Output:
  data/dishes/<NNN>-<slug>.yaml
  data/ingredients/<id>.yaml
"""

from __future__ import annotations

import re
from datetime import date

import click
from rich.console import Console

from pipeline.paths import DISHES_DIR, INGREDIENTS_DIR
from pipeline.transcription import (
    DISHES,
    INGREDIENT_REGISTRY,
    DishTranscription,
    assert_invariants,
)
from pipeline.yaml_io import dump_yaml

console = Console()
TODAY = date.today().isoformat()


def _slugify_for_dish(d: DishTranscription) -> str:
    """Build dish file slug: <NNN>-<jyutping-with-hyphens>."""
    # convert jyutping "mat6 zap1 caa1 siu1 faan6" → "mat6-zap1-caa1-siu1-faan6"
    slug = re.sub(r"\s+", "-", d.jyutping.strip().lower())
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    return f"{d.no:03d}-{slug}"


def _emit_ingredient_stub(reg_entry: dict, force: bool = False) -> bool:
    path = INGREDIENTS_DIR / f"{reg_entry['id']}.yaml"
    if path.exists() and not force:
        return False
    doc = {
        "id": reg_entry["id"],
        "names": {
            "yue_hant": reg_entry["yue_hant"],
            "jyutping": reg_entry["jyutping"],
            "zh": reg_entry["zh"],
            "en": reg_entry["en"],
        },
        "category": reg_entry["cat"],
        "sources": [
            {
                "source_id": "menu-2025-handwritten",
                "accessed": TODAY,
                "note": "first attested in source menu transcription",
            }
        ],
    }
    dump_yaml(doc, path)
    return True


def _emit_dish_stub(d: DishTranscription, force: bool = False) -> tuple[bool, str]:
    slug = _slugify_for_dish(d)
    path = DISHES_DIR / f"{slug}.yaml"
    if path.exists() and not force:
        return False, slug

    ingredients = []
    for ing_id, qty, unit in d.ingredients:
        entry = {"ref": ing_id, "qty": qty, "unit": unit}
        ingredients.append(entry)

    doc = {
        "id": slug,
        "menu_no": d.no,
        "names": {
            "yue_hant": d.yue_hant,
            "jyutping": d.jyutping,
            "zh": d.zh,
            "en": d.en,
        },
        "category": d.category,
        "ingredients": ingredients,
        "method_status": "stub",
        "sources": [
            {
                "source_id": "menu-2025-handwritten",
                "accessed": TODAY,
                "note": f"Item #{d.no} on the source menu",
            }
        ],
        "created": TODAY,
        "updated": TODAY,
    }
    if d.sauce:
        doc["sauce"] = d.sauce
    if d.variants:
        doc["variants"] = list(d.variants)
    if d.notes:
        # The free-text menu note becomes a single "tip" with zh body so it
        # survives schema validation; subsequent enrichment can refine.
        doc["tips"] = [{"zh": d.notes}]

    dump_yaml(doc, path)
    return True, slug


@click.command("init")
@click.option("--force", is_flag=True, help="Overwrite existing files.")
@click.option("--dry-run", is_flag=True, help="Don't write files; just report.")
def init_cmd(force: bool, dry_run: bool) -> None:
    """Generate stub dish + ingredient YAMLs from the menu transcription."""
    assert_invariants()
    console.print(f"[bold]Transcription invariants OK.[/bold] {len(DISHES)} dishes, {len(INGREDIENT_REGISTRY)} new ingredients.")

    if dry_run:
        console.print("[yellow]--dry-run: no files will be written.[/yellow]")

    new_ing = 0
    skip_ing = 0
    for entry in INGREDIENT_REGISTRY:
        path = INGREDIENTS_DIR / f"{entry['id']}.yaml"
        if path.exists() and not force:
            skip_ing += 1
            continue
        if not dry_run:
            _emit_ingredient_stub(entry, force)
        new_ing += 1

    console.print(f"  ingredients: [green]+{new_ing} new[/green], {skip_ing} skipped")

    new_dish = 0
    skip_dish = 0
    for d in DISHES:
        slug = _slugify_for_dish(d)
        path = DISHES_DIR / f"{slug}.yaml"
        if path.exists() and not force:
            skip_dish += 1
            continue
        if not dry_run:
            _emit_dish_stub(d, force)
        new_dish += 1

    console.print(f"  dishes:      [green]+{new_dish} new[/green], {skip_dish} skipped")
    console.print("\n[bold green]✓ init complete[/bold green]" if not dry_run else "[bold yellow]dry run complete[/bold yellow]")
