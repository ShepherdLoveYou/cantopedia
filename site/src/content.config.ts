import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// YAML auto-parses dates like 2026-05-24 into Date objects. Accept both Date
// and string, normalising to ISO date string ("YYYY-MM-DD") for downstream use.
const DateString = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
);

const TriLangText = z.object({
  yue_hant: z.string(),
  jyutping: z.string(),
  zh: z.string(),
  en: z.string(),
});

const TriLangBody = z.object({
  yue: z.string().optional(),
  zh: z.string(),
  en: z.string().optional(),
});

const SourceRef = z.object({
  source_id: z.string(),
  url: z.string().url().optional(),
  accessed: DateString,
  note: z.string().optional(),
});

const TriLangBodyPartial = z.object({
  yue: z.string().optional(),
  zh: z.string().optional(),
  en: z.string().optional(),
});

const Ingredient = z.object({
  ref: reference('ingredient'),
  qty: z.number().positive(),
  unit: z.enum([
    '件', '兩', '錢', '磅', '碗', '匙', '茶匙', '克', '毫升',
    '個', '條', '粒', '滴', '片', '份', '適量',
  ]),
  prep: TriLangBodyPartial.optional(),
  notes: z.string().optional(),
});

const MethodStep = z.object({
  order: z.number().int().positive(),
  body: TriLangBody,
  time_seconds: z.number().int().optional(),
  temperature_c: z.number().optional(),
  cite: z.array(z.string()).optional(),
});

const ImageMeta = z.object({
  path: z.string(),
  source_id: z.string(),
  license: z.enum([
    'CC0', 'CC-BY-2.0', 'CC-BY-3.0', 'CC-BY-4.0',
    'CC-BY-SA-2.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0',
    'Unsplash', 'Pexels', 'AI-generated', 'Public-Domain',
  ]),
  credit: z.string(),
  alt: TriLangText.partial().optional(),
});

const dish = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../data/dishes' }),
  schema: z.object({
    id: z.string().regex(/^\d{3}-[a-z0-9-]+$/),
    menu_no: z.number().int().positive(),
    names: TriLangText,
    category: reference('category'),
    ingredients: z.array(Ingredient).min(1),
    sauce: reference('sauce').optional(),
    variants: z.array(reference('dish')).optional(),
    servings: z.number().int().positive().default(2),
    difficulty: z.enum(['easy', 'medium', 'hard', 'pro']).optional(),
    time_minutes: z
      .object({
        prep: z.number().int().nonnegative(),
        cook: z.number().int().nonnegative(),
      })
      .optional(),
    equipment: z
      .array(
        z.enum([
          'wok', 'rice_cooker', 'steamer', 'oven', 'pressure_cooker',
          'chinese_cleaver', 'blender', 'smoker', 'sous_vide',
        ])
      )
      .optional(),
    method_status: z.enum(['stub', 'draft', 'complete']),
    method: z.array(MethodStep).optional(),
    tips: z.array(TriLangBody).optional(),
    history: TriLangBody.optional(),
    allergens: z
      .array(
        z.enum([
          'gluten', 'peanut', 'tree_nut', 'shellfish', 'dairy',
          'egg', 'soy', 'sesame', 'sulfite',
        ])
      )
      .optional(),
    images: z.array(ImageMeta).optional(),
    sources: z.array(SourceRef).min(1),
    created: DateString,
    updated: DateString,
  }),
});

const sauce = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../data/sauces' }),
  schema: z.object({
    id: z.string(),
    names: TriLangText,
    base_ingredients: z.array(Ingredient),
    method: z.array(MethodStep).optional(),
    yield_ml: z.number().positive().optional(),
    storage: TriLangBody.optional(),
    used_in: z.array(reference('dish')).optional(),
    sources: z.array(SourceRef).min(1),
  }),
});

const ingredient = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../data/ingredients' }),
  schema: z.object({
    id: z.string(),
    names: TriLangText,
    category: z.enum([
      'meat', 'seafood', 'vegetable', 'grain', 'sauce',
      'spice', 'dairy', 'egg', 'noodle', 'fruit', 'other',
    ]),
    nutrition_per_100g: z
      .object({
        kcal: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
        carb_g: z.number(),
      })
      .optional(),
    procurement: z
      .object({
        availability: z.array(
          z.enum(['hk', 'mainland', 'us', 'eu', 'sea', 'jp_kr', 'au'])
        ),
        alternatives: z.array(reference('ingredient')).optional(),
        notes: TriLangBody.optional(),
      })
      .optional(),
    sources: z.array(SourceRef).min(1),
  }),
});

const category = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../data/categories' }),
  schema: z.object({
    id: z.string(),
    names: TriLangText,
    description: TriLangBody,
    sort_order: z.number().int(),
  }),
});

const source = defineCollection({
  loader: glob({ pattern: '*.yaml', base: '../data/sources' }),
  schema: z.object({
    id: z.string(),
    type: z.enum([
      'wikipedia', 'wikimedia-commons', 'usda', 'hk-gov',
      'academic', 'cc-blog', 'book', 'manual',
    ]),
    title: z.string(),
    url: z.string().url().optional(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    license: z.string(),
    accessed: DateString,
    isbn: z.string().optional(),
  }),
});

export const collections = { dish, sauce, ingredient, category, source };
