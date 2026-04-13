import { describe, expect, it } from '@jest/globals';

import {
  heuristicEditionsFromPayload,
  mergeHeuristicWithManual,
} from './movie-editions-from-snapshot.util';

describe('movie-editions-from-snapshot.util', () => {
  it('collects distinct TMDB types from payload', () => {
    const payload = {
      results: [
        {
          iso_3166_1: 'US',
          release_dates: [
            { type: 3, release_date: '2024-01-01' },
            { type: 4, release_date: '2024-03-01' },
          ],
        },
      ],
    };
    const h = heuristicEditionsFromPayload(payload);
    expect(h.map((x) => x.editionKey)).toEqual(['theatrical', 'digital']);
  });

  it('merge prefers manual label for same key', () => {
    const h = heuristicEditionsFromPayload({
      results: [
        {
          iso_3166_1: 'US',
          release_dates: [{ type: 3, release_date: '2024-01-01' }],
        },
      ],
    });
    const m = mergeHeuristicWithManual(h, [
      {
        edition_key: 'theatrical',
        label: 'Cinema',
        sort_order: 0,
        meta: { note: 'override' },
      },
    ]);
    expect(m).toHaveLength(1);
    expect(m[0]?.label).toBe('Cinema');
    expect(m[0]?.source).toBe('manual');
  });
});
