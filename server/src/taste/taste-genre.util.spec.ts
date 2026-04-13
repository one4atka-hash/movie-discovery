import { aggregateGenreCounts, countsToWeights } from './taste-genre.util';

describe('taste-genre.util', () => {
  it('aggregates genres across movies and normalizes weights', () => {
    const map = aggregateGenreCounts([
      [{ id: 18, name: 'Drama' }],
      [
        { id: 18, name: 'Drama' },
        { id: 35, name: 'Comedy' },
      ],
      null,
      'not-array',
    ]);
    const w = countsToWeights(map);
    expect(w).toHaveLength(2);
    // Drama: 2 hits; Comedy: 1; total 3 occurrences
    expect(w.find((x) => x.id === 18)?.weight).toBeCloseTo(0.667, 3);
    expect(w.find((x) => x.id === 35)?.weight).toBeCloseTo(0.333, 3);
  });

  it('returns empty weights for no genres', () => {
    expect(countsToWeights(aggregateGenreCounts([]))).toEqual([]);
  });

  it('sorts by weight then id', () => {
    const map = aggregateGenreCounts([
      [{ id: 2, name: 'A' }],
      [{ id: 2, name: 'A' }],
      [{ id: 1, name: 'B' }],
    ]);
    const w = countsToWeights(map);
    expect(w[0]?.id).toBe(2);
    expect(w[1]?.id).toBe(1);
  });
});
