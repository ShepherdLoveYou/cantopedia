import type { CollectionEntry } from 'astro:content';

type Cat = CollectionEntry<'category'>;

export function getPivotNeighbors(currentId: string, all: Cat[]) {
  const sorted = [...all].sort((a, b) => a.data.sort_order - b.data.sort_order);
  const i = sorted.findIndex((c) => c.id === currentId);
  if (i < 0) throw new Error(`Category not found: ${currentId}`);
  const n = sorted.length;
  return {
    prev: sorted[(i - 1 + n) % n],
    curr: sorted[i],
    next: sorted[(i + 1) % n],
  };
}
