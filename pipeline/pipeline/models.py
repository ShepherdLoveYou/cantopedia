"""Pydantic models mirroring site/src/content.config.ts (Zod schemas).

Parity is enforced by `tests/test_schema_parity.py` — if you change a field
here, also change the corresponding Zod schema (and vice versa).
"""

from __future__ import annotations

import re
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

# ---------- shared types ----------

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _coerce_date_string(v: object) -> str:
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str) and ISO_DATE_RE.match(v):
        return v
    raise ValueError(f"Expected ISO date string (YYYY-MM-DD), got: {v!r}")


DateString = Annotated[str, BeforeValidator(_coerce_date_string)]


class TriLangText(BaseModel):
    model_config = ConfigDict(extra="forbid")
    yue_hant: str
    jyutping: str
    zh: str
    en: str


class TriLangBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    yue: str | None = None
    zh: str
    en: str | None = None


class TriLangTextPartial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    yue_hant: str | None = None
    jyutping: str | None = None
    zh: str | None = None
    en: str | None = None


class SourceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: str
    url: str | None = None
    accessed: DateString
    note: str | None = None


Unit = Literal[
    "件", "兩", "錢", "磅", "碗", "匙", "茶匙", "克", "毫升",
    "個", "條", "粒", "滴", "片", "份", "適量",
]


class IngredientRefBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ref: str
    qty: float = Field(gt=0)
    unit: Unit
    prep: TriLangTextPartial | None = None
    notes: str | None = None


class MethodStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    order: int = Field(gt=0)
    body: TriLangBody
    time_seconds: int | None = None
    temperature_c: float | None = None
    cite: list[str] | None = None


License = Literal[
    "CC0", "CC-BY-2.0", "CC-BY-3.0", "CC-BY-4.0",
    "CC-BY-SA-2.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0",
    "Unsplash", "Pexels", "AI-generated", "Public-Domain",
]


class ImageMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    source_id: str
    license: License
    credit: str
    alt: TriLangTextPartial | None = None


# ---------- collection schemas ----------


CategoryId = Literal[
    "appetizer", "soup-wonton", "rice", "noodle", "soup-noodle",
    "baked-rice", "congee", "main",
]

Equipment = Literal[
    "wok", "rice_cooker", "steamer", "oven", "pressure_cooker",
    "chinese_cleaver", "blender", "smoker", "sous_vide",
]

Allergen = Literal[
    "gluten", "peanut", "tree_nut", "shellfish", "dairy",
    "egg", "soy", "sesame", "sulfite",
]

MethodStatus = Literal["stub", "draft", "complete"]


class TimeMinutes(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prep: int = Field(ge=0)
    cook: int = Field(ge=0)


class Dish(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^\d{3}-[a-z0-9-]+$")
    menu_no: int = Field(gt=0)
    names: TriLangText
    category: CategoryId
    ingredients: list[IngredientRefBlock] = Field(min_length=1)
    sauce: str | None = None
    variants: list[str] | None = None
    servings: int = 2
    difficulty: Literal["easy", "medium", "hard", "pro"] | None = None
    time_minutes: TimeMinutes | None = None
    equipment: list[Equipment] | None = None
    method_status: MethodStatus
    method: list[MethodStep] | None = None
    tips: list[TriLangBody] | None = None
    history: TriLangBody | None = None
    allergens: list[Allergen] | None = None
    images: list[ImageMeta] | None = None
    sources: list[SourceRef] = Field(min_length=1)
    created: DateString
    updated: DateString


class Sauce(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    names: TriLangText
    base_ingredients: list[IngredientRefBlock]
    method: list[MethodStep] | None = None
    yield_ml: float | None = Field(default=None, gt=0)
    storage: TriLangBody | None = None
    used_in: list[str] | None = None
    sources: list[SourceRef] = Field(min_length=1)


IngredientCategory = Literal[
    "meat", "seafood", "vegetable", "grain", "sauce",
    "spice", "dairy", "egg", "noodle", "fruit", "other",
]


class NutritionPer100g(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kcal: float
    protein_g: float
    fat_g: float
    carb_g: float


Region = Literal["hk", "mainland", "us", "eu", "sea", "jp_kr", "au"]


class Procurement(BaseModel):
    model_config = ConfigDict(extra="forbid")
    availability: list[Region]
    alternatives: list[str] | None = None
    notes: TriLangBody | None = None


class Ingredient(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    names: TriLangText
    category: IngredientCategory
    nutrition_per_100g: NutritionPer100g | None = None
    procurement: Procurement | None = None
    sources: list[SourceRef] = Field(min_length=1)


class Category(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    names: TriLangText
    description: TriLangBody
    sort_order: int


SourceType = Literal[
    "wikipedia", "wikimedia-commons", "usda", "hk-gov",
    "academic", "cc-blog", "book", "manual",
]


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    type: SourceType
    title: str
    url: str | None = None
    authors: list[str] | None = None
    publisher: str | None = None
    license: str
    accessed: DateString
    isbn: str | None = None
