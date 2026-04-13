import { describe, expect, it } from 'vitest';

import { filterOnlyMyServices } from './only-my-services.util';

describe('filterOnlyMyServices', () => {
  it('returns all movies when toggle is off', () => {
    const movies = [{ id: 1 }, { id: 2 }] as any[];
    const out = filterOnlyMyServices(movies, false, { '1': ['Netflix'] });
    expect(out.map((x) => x.id)).toEqual([1, 2]);
  });

  it('filters movies without matched providers when toggle is on', () => {
    const movies = [{ id: 1 }, { id: 2 }, { id: 3 }] as any[];
    const out = filterOnlyMyServices(movies, true, { '1': ['Netflix'], '3': [] });
    expect(out.map((x) => x.id)).toEqual([1]);
  });
});
