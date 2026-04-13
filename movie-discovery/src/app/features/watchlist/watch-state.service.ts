import { Injectable, computed, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';
import type { WatchStateItem, WatchStatus } from './watch-state.model';

const STORAGE_KEY = 'watch.state.v1';

const ORDER: readonly WatchStatus[] = ['want', 'watching', 'watched', 'dropped', 'hidden'];

@Injectable({ providedIn: 'root' })
export class WatchStateService {
  private readonly _items = signal<WatchStateItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly sorted = computed(() =>
    [...this._items()].sort(
      (a, b) => b.updatedAt - a.updatedAt || a.movie.title.localeCompare(b.movie.title),
    ),
  );

  constructor(private readonly storage: StorageService) {
    const raw = this.storage.get<unknown>(STORAGE_KEY, []);
    const list = Array.isArray(raw) ? (raw as unknown[]) : [];
    this._items.set(
      list
        .filter((x) => Boolean(x && typeof x === 'object'))
        .map((x) => sanitizeItem(x as Partial<WatchStateItem>))
        .filter(Boolean) as WatchStateItem[],
    );
  }

  getStatus(tmdbId: number): WatchStatus | null {
    return this._items().find((i) => i.tmdbId === tmdbId)?.status ?? null;
  }

  setStatus(movie: Movie, status: WatchStatus | null): void {
    const id = movie.id;
    const cur = this._items();
    const idx = cur.findIndex((i) => i.tmdbId === id);

    if (status === null) {
      if (idx < 0) return;
      this.persist([...cur.slice(0, idx), ...cur.slice(idx + 1)]);
      return;
    }

    const next: WatchStateItem = {
      tmdbId: id,
      status,
      movie: {
        id,
        title: movie.title,
        poster_path: movie.poster_path ?? null,
        release_date: movie.release_date ?? '',
        vote_average: Number.isFinite(movie.vote_average) ? movie.vote_average : 0,
      },
      updatedAt: Date.now(),
    };

    const out = idx >= 0 ? [...cur.slice(0, idx), next, ...cur.slice(idx + 1)] : [next, ...cur];
    this.persist(out);
  }

  cycle(movie: Movie): WatchStatus {
    const cur = this.getStatus(movie.id);
    const next = (() => {
      if (!cur) return 'want';
      const i = ORDER.indexOf(cur);
      return ORDER[(i + 1) % ORDER.length] ?? 'want';
    })();
    this.setStatus(movie, next);
    return next;
  }

  clear(tmdbId: number): void {
    this.setStatus(
      {
        id: tmdbId,
        title: '',
        overview: '',
        poster_path: null,
        backdrop_path: null,
        release_date: '',
        vote_average: 0,
      },
      null,
    );
  }

  private persist(next: WatchStateItem[]): void {
    this._items.set(next);
    this.storage.set(STORAGE_KEY, next);
  }
}

function sanitizeItem(x: Partial<WatchStateItem>): WatchStateItem | null {
  const tmdbId =
    typeof x.tmdbId === 'number'
      ? x.tmdbId
      : typeof (x as any).tmdbId === 'number'
        ? (x as any).tmdbId
        : null;
  const status = x.status;
  if (!tmdbId || !Number.isFinite(tmdbId)) return null;
  if (
    status !== 'want' &&
    status !== 'watching' &&
    status !== 'watched' &&
    status !== 'dropped' &&
    status !== 'hidden'
  ) {
    return null;
  }
  const m = x.movie as any;
  const title = typeof m?.title === 'string' ? m.title : '';
  if (!title) return null;
  return {
    tmdbId,
    status,
    movie: {
      id: tmdbId,
      title,
      poster_path: typeof m?.poster_path === 'string' ? m.poster_path : null,
      release_date: typeof m?.release_date === 'string' ? m.release_date : '',
      vote_average: typeof m?.vote_average === 'number' ? m.vote_average : 0,
    },
    updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
  };
}
