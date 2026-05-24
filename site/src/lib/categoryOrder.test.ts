import { describe, it, expect } from 'vitest';
import { getPivotNeighbors } from './categoryOrder';

// Minimal mock shape — only the fields the helper reads.
type Cat = { id: string; data: { sort_order: number } };

const cats: Cat[] = [
  { id: 'appetizer',   data: { sort_order: 10 } },
  { id: 'soup-wonton', data: { sort_order: 20 } },
  { id: 'rice',        data: { sort_order: 30 } },
  { id: 'noodle',      data: { sort_order: 40 } },
  { id: 'soup-noodle', data: { sort_order: 50 } },
  { id: 'baked-rice',  data: { sort_order: 60 } },
  { id: 'congee',      data: { sort_order: 70 } },
  { id: 'main',        data: { sort_order: 80 } },
];

describe('getPivotNeighbors', () => {
  it('returns prev/curr/next for a middle item', () => {
    const { prev, curr, next } = getPivotNeighbors('rice', cats as any);
    expect(prev.id).toBe('soup-wonton');
    expect(curr.id).toBe('rice');
    expect(next.id).toBe('noodle');
  });

  it('wraps around at the start', () => {
    const { prev, curr, next } = getPivotNeighbors('appetizer', cats as any);
    expect(prev.id).toBe('main');
    expect(curr.id).toBe('appetizer');
    expect(next.id).toBe('soup-wonton');
  });

  it('wraps around at the end', () => {
    const { prev, curr, next } = getPivotNeighbors('main', cats as any);
    expect(prev.id).toBe('congee');
    expect(curr.id).toBe('main');
    expect(next.id).toBe('appetizer');
  });

  it('respects sort_order, not array order', () => {
    const shuffled = [...cats].reverse();
    const { prev, next } = getPivotNeighbors('rice', shuffled as any);
    expect(prev.id).toBe('soup-wonton');
    expect(next.id).toBe('noodle');
  });

  it('throws when the id is unknown', () => {
    expect(() => getPivotNeighbors('nonsense', cats as any)).toThrow(/nonsense/);
  });
});
