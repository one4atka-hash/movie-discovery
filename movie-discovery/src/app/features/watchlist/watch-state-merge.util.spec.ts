import { describe, expect, it } from 'vitest';

import { mergeWatchState } from './watch-state-merge.util';

describe('mergeWatchState', () => {
  it('keeps server item if server is newer', () => {
    const local = [
      {
        tmdbId: 1,
        status: 'want',
        movie: { id: 1, title: 'A', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 100,
      },
    ] as any[];
    const server = [
      {
        tmdbId: 1,
        status: 'watched',
        movie: { id: 1, title: 'A', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 200,
      },
    ] as any[];
    const out = mergeWatchState(local, server);
    expect(out[0].status).toBe('watched');
  });

  it('keeps local item if local is newer', () => {
    const local = [
      {
        tmdbId: 1,
        status: 'watching',
        movie: { id: 1, title: 'A', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 300,
      },
    ] as any[];
    const server = [
      {
        tmdbId: 1,
        status: 'want',
        movie: { id: 1, title: 'A', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 200,
      },
    ] as any[];
    const out = mergeWatchState(local, server);
    expect(out[0].status).toBe('watching');
  });

  it('merges disjoint sets', () => {
    const local = [
      {
        tmdbId: 1,
        status: 'want',
        movie: { id: 1, title: 'B', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 100,
      },
    ] as any[];
    const server = [
      {
        tmdbId: 2,
        status: 'watched',
        movie: { id: 2, title: 'A', poster_path: null, release_date: '', vote_average: 0 },
        updatedAt: 200,
      },
    ] as any[];
    const out = mergeWatchState(local, server);
    expect(out.map((x) => x.tmdbId).sort()).toEqual([1, 2]);
  });
});
