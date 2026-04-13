import { diffAvailability } from './availability-diff.util';

describe('availability diff util', () => {
  it('returns null when sets are equal (ignores duplicates and case)', () => {
    const out = diffAvailability(
      {
        tmdbId: 1,
        region: 'us',
        providers: ['Netflix', 'NETFLIX', '  prime  '],
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        tmdbId: 1,
        region: 'US',
        providers: ['prime', 'netflix'],
        fetchedAt: '2026-01-02T00:00:00.000Z',
      },
    );
    expect(out).toBeNull();
  });

  it('detects added providers', () => {
    const out = diffAvailability(
      {
        tmdbId: 1,
        region: 'US',
        providers: ['netflix'],
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        tmdbId: 1,
        region: 'US',
        providers: ['netflix', 'prime'],
        fetchedAt: '2026-01-02T00:00:00.000Z',
      },
    );
    expect(out).toMatchObject({
      type: 'added',
      addedProviders: ['prime'],
      removedProviders: [],
      at: '2026-01-02T00:00:00.000Z',
    });
  });

  it('detects removed providers (leaving)', () => {
    const out = diffAvailability(
      {
        tmdbId: 1,
        region: 'US',
        providers: ['netflix', 'prime'],
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        tmdbId: 1,
        region: 'US',
        providers: ['prime'],
        fetchedAt: '2026-01-02T00:00:00.000Z',
      },
    );
    expect(out).toMatchObject({
      type: 'leaving',
      addedProviders: [],
      removedProviders: ['netflix'],
    });
  });

  it('detects both added and removed as a single changed event', () => {
    const out = diffAvailability(
      {
        tmdbId: 1,
        region: 'US',
        providers: ['netflix'],
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        tmdbId: 1,
        region: 'US',
        providers: ['prime'],
        fetchedAt: '2026-01-02T00:00:00.000Z',
      },
    );
    expect(out).toMatchObject({
      type: 'changed',
      addedProviders: ['prime'],
      removedProviders: ['netflix'],
    });
  });

  it('normalizes region to ISO-2', () => {
    const out = diffAvailability(
      {
        tmdbId: 1,
        region: 'XX',
        providers: [],
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        tmdbId: 1,
        region: ' usa ',
        providers: ['netflix'],
        fetchedAt: '2026-01-02T00:00:00.000Z',
      },
    );
    expect(out?.region).toBe('US');
  });
});
