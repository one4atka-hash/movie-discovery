import { releaseDateYmdFromSnapshot } from './release-dates-from-snapshot.util';

describe('release-dates-from-snapshot.util', () => {
  const payload = {
    results: [
      {
        iso_3166_1: 'US',
        release_dates: [
          { type: 2, release_date: '2026-05-01' },
          { type: 3, release_date: '2026-04-20' },
          { type: 4, release_date: '2026-06-01' },
        ],
      },
    ],
  };

  it('picks earliest theatrical date in region', () => {
    expect(releaseDateYmdFromSnapshot(payload, 'US', 'theatrical')).toBe(
      '2026-04-20',
    );
  });

  it('picks digital', () => {
    expect(releaseDateYmdFromSnapshot(payload, 'US', 'digital')).toBe(
      '2026-06-01',
    );
  });

  it('picks earliest any', () => {
    expect(releaseDateYmdFromSnapshot(payload, 'US', 'any')).toBe('2026-04-20');
  });
});
