import { describe, it, expect, beforeEach } from 'vitest';
import type { Planet } from '../filters';
import { _originalFilterEarthLike } from '../filters';
import { memoizedFilterEarthLike, memoizedEarthLikeScore, memoizedWeirdnessScore, clearFilterCaches } from '../memoizedFilters';

describe('memoizedFilters circular dependency regression', () => {
  const planets: Planet[] = [
    { pl_name: 'A', pl_rade: 1, pl_insol: 1, pl_eqt: 255, sy_dist: 10 },
    { pl_name: 'B', pl_rade: 2.5, pl_insol: 3, pl_eqt: 800, sy_dist: 20 },
    { pl_name: 'C', pl_rade: 0.9, pl_insol: 0.8, pl_eqt: 260, sy_dist: 5 },
  ];

  beforeEach(() => {
    clearFilterCaches();
  });

  it('does not overflow the stack when scoring and filtering', () => {
    expect(() => {
      // exercise score memoizers
      for (const p of planets) {
        void memoizedEarthLikeScore(p);
        void memoizedWeirdnessScore(p);
      }
      // exercise filter memoizer
      const result = memoizedFilterEarthLike(planets);
      expect(Array.isArray(result)).toBe(true);
    }).not.toThrow();
  });

  it('matches the original filter output on a simple dataset', () => {
    const original = _originalFilterEarthLike(planets).map(p => p.pl_name);
    const memo = memoizedFilterEarthLike(planets).map(p => p.pl_name);
    expect(memo).toEqual(original);
  });
});


