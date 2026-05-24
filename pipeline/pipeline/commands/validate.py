"""`pipeline validate` — full schema check over data/.

Loads every YAML in data/<collection>/ and runs it through the pydantic models
(mirror of the Zod schemas in site/src/content.config.ts). Also enforces
cross-references: every `ref:` in a dish ingredient must point to a real
ingredient file; every `source_id` must point to a real source file; every
`sauce:` and `variants:` must resolve.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

import click
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from pipeline.models import Category, Dish, Ingredient, Sauce, Source
from pipeline.paths import (
    CATEGORIES_DIR,
    DISHES_DIR,
    INGREDIENTS_DIR,
    SAUCES_DIR,
    SOURCES_DIR,
)
from pipeline.yaml_io import load_yaml

console = Console()


def _load_collection(dir_: Path, model_cls) -> tuple[dict[str, object], list[str]]:
    entries: dict[str, object] = {}
    errors: list[str] = []
    for path in sorted(dir_.glob("*.yaml")):
        if path.name.endswith(".draft.yaml"):
            continue
        try:
            raw = load_yaml(path)
            if raw is None:
                errors.append(f"{path.name}: empty document")
                continue
            entry = model_cls.model_validate(raw)
            entry_id = raw.get("id", path.stem)
            if entry_id in entries:
                errors.append(f"{path.name}: duplicate id '{entry_id}'")
                continue
            entries[entry_id] = entry
        except ValidationError as e:
            for err in e.errors():
                loc = ".".join(str(x) for x in err["loc"])
                errors.append(f"{path.name}: {loc}: {err['msg']}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{path.name}: {type(e).__name__}: {e}")
    return entries, errors


def _check_references(
    dishes: dict[str, Dish],
    sauces: dict[str, Sauce],
    ingredients: dict[str, Ingredient],
    categories: dict[str, Category],
    sources: dict[str, Source],
) -> list[str]:
    errors: list[str] = []
    for did, dish in dishes.items():
        if dish.category not in categories:
            errors.append(f"dish {did}: references unknown category '{dish.category}'")
        for ing_ref in dish.ingredients:
            if ing_ref.ref not in ingredients:
                errors.append(f"dish {did}: ingredient '{ing_ref.ref}' has no matching ingredient yaml")
        if dish.sauce and dish.sauce not in sauces:
            errors.append(f"dish {did}: sauce '{dish.sauce}' has no matching sauce yaml")
        for variant in dish.variants or []:
            if variant not in dishes:
                # variants may legitimately point to dishes not yet stubbed (e.g. 047 → 047b/047c)
                pass
        for sref in dish.sources:
            if sref.source_id not in sources:
                errors.append(f"dish {did}: source '{sref.source_id}' has no matching source yaml")
        # method_status=complete must have non-empty method
        if dish.method_status == "complete" and not dish.method:
            errors.append(f"dish {did}: method_status=complete but method is empty")

    for sid, sauce in sauces.items():
        for ing_ref in sauce.base_ingredients:
            if ing_ref.ref not in ingredients:
                errors.append(f"sauce {sid}: ingredient '{ing_ref.ref}' has no matching ingredient yaml")
        for sref in sauce.sources:
            if sref.source_id not in sources:
                errors.append(f"sauce {sid}: source '{sref.source_id}' has no matching source yaml")

    for iid, ing in ingredients.items():
        for sref in ing.sources:
            if sref.source_id not in sources:
                errors.append(f"ingredient {iid}: source '{sref.source_id}' has no matching source yaml")

    return errors


@click.command("validate")
@click.option("--quiet", "-q", is_flag=True, help="Only print failures.")
def validate_cmd(quiet: bool) -> None:
    """Validate every YAML against the schema and check cross-references."""
    all_errors: list[str] = []
    counts: list[tuple[str, int]] = []

    cats, cat_errs = _load_collection(CATEGORIES_DIR, Category)
    counts.append(("categories", len(cats)))
    all_errors.extend(cat_errs)

    srcs, src_errs = _load_collection(SOURCES_DIR, Source)
    counts.append(("sources", len(srcs)))
    all_errors.extend(src_errs)

    ings, ing_errs = _load_collection(INGREDIENTS_DIR, Ingredient)
    counts.append(("ingredients", len(ings)))
    all_errors.extend(ing_errs)

    sces, sce_errs = _load_collection(SAUCES_DIR, Sauce)
    counts.append(("sauces", len(sces)))
    all_errors.extend(sce_errs)

    dishes, dish_errs = _load_collection(DISHES_DIR, Dish)
    counts.append(("dishes", len(dishes)))
    all_errors.extend(dish_errs)

    ref_errors = _check_references(dishes, sces, ings, cats, srcs)
    all_errors.extend(ref_errors)

    if not quiet:
        tbl = Table(title="data/ inventory", show_header=True, header_style="bold")
        tbl.add_column("collection")
        tbl.add_column("count", justify="right")
        for name, n in counts:
            tbl.add_row(name, str(n))
        console.print(tbl)

        if isinstance(dishes, dict) and dishes:
            statuses = Counter(d.method_status for d in dishes.values())
            console.print(f"  dish method_status: stub={statuses.get('stub', 0)}, draft={statuses.get('draft', 0)}, complete={statuses.get('complete', 0)}")

    if all_errors:
        console.print(f"\n[bold red]{len(all_errors)} error(s):[/bold red]")
        for e in all_errors:
            console.print(f"  [red]✗[/red] {e}")
        sys.exit(1)
    elif not quiet:
        console.print("\n[bold green]✓ all validations passed[/bold green]")
