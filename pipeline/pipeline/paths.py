"""Shared paths for the pipeline."""

from __future__ import annotations

from pathlib import Path

# pipeline/pipeline/paths.py → ../../ → repo root
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data"
DISHES_DIR = DATA_DIR / "dishes"
SAUCES_DIR = DATA_DIR / "sauces"
INGREDIENTS_DIR = DATA_DIR / "ingredients"
CATEGORIES_DIR = DATA_DIR / "categories"
SOURCES_DIR = DATA_DIR / "sources"
CACHE_DIR = REPO_ROOT / "pipeline" / "cache"
RAW_DIR = REPO_ROOT / "raw_materials"
