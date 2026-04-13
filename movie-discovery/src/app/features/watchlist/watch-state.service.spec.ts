import { describe, expect, it, vi } from 'vitest';

import { WatchStateService } from './watch-state.service';
import { StorageService } from '@core/storage.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';

function makeStorage(seed: unknown = []): StorageService {
  const mem = new Map<string, string>();
  mem.set('watch.state.v1', JSON.stringify(seed));

  return {
    get: (key: string, fallback: any = null) => {
      const raw = mem.get(key);
      if (!raw) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set: (key: string, value: unknown) => {
      mem.set(key, JSON.stringify(value));
    },
    remove: (key: string) => {
      mem.delete(key);
    },
  } as unknown as StorageService;
}

function movie(id = 1, title = 'Movie'): Movie {
  return {
    id,
    title,
    overview: '',
    poster_path: null,
    backdrop_path: null,
    release_date: '2020-01-01',
    vote_average: 7.1,
  };
}

describe('WatchStateService', () => {
  it('cycles statuses in the expected order', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const svc = new WatchStateService(makeStorage());
    const m = movie(10, 'A');

    expect(svc.getStatus(10)).toBeNull();
    expect(svc.cycle(m)).toBe('want');
    expect(svc.cycle(m)).toBe('watching');
    expect(svc.cycle(m)).toBe('watched');
    expect(svc.cycle(m)).toBe('dropped');
    expect(svc.cycle(m)).toBe('hidden');
    expect(svc.cycle(m)).toBe('want');

    vi.useRealTimers();
  });

  it('clear removes item', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const svc = new WatchStateService(makeStorage());
    const m = movie(1, 'A');
    svc.setStatus(m, 'want');
    expect(svc.getStatus(1)).toBe('want');

    svc.clear(1);
    expect(svc.getStatus(1)).toBeNull();
    expect(svc.items()).toHaveLength(0);

    vi.useRealTimers();
  });

  it('sanitizes storage payload on load', () => {
    const svc = new WatchStateService(
      makeStorage([
        null,
        { tmdbId: 0, status: 'want', movie: { title: 'x' }, updatedAt: 1 },
        { tmdbId: 1, status: 'nope', movie: { title: 'x' }, updatedAt: 1 },
        { tmdbId: 2, status: 'want', movie: { title: '' }, updatedAt: 1 },
        { tmdbId: 3, status: 'want', movie: { title: 'Ok' }, updatedAt: 1 },
      ]),
    );
    expect(svc.items()).toHaveLength(1);
    expect(svc.items()[0]?.tmdbId).toBe(3);
  });
});
