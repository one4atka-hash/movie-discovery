import { Injectable, computed, inject, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';

export type MovieReaction = 'like' | 'dislike' | null;

type StoredMap = Record<string, Exclude<MovieReaction, null>>;

const KEY = 'movies.reactions.v1';

@Injectable({ providedIn: 'root' })
export class MovieReactionsService {
  private readonly storage = inject(StorageService);
  private readonly _map = signal<StoredMap>(this.load());

  readonly all = this._map.asReadonly();

  reactionFor(movieId: number) {
    return computed<MovieReaction>(() => {
      const id = String(movieId);
      return this._map()[id] ?? null;
    });
  }

  toggle(movieId: number, next: Exclude<MovieReaction, null>): void {
    const id = String(movieId);
    const cur = this._map()[id] ?? null;
    const updated: StoredMap = { ...this._map() };
    if (cur === next) {
      delete updated[id];
    } else {
      updated[id] = next;
    }
    this.persist(updated);
  }

  clear(movieId: number): void {
    const id = String(movieId);
    if (!(id in this._map())) return;
    const updated: StoredMap = { ...this._map() };
    delete updated[id];
    this.persist(updated);
  }

  private load(): StoredMap {
    const raw = this.storage.get<unknown>(KEY, {});
    if (!raw || typeof raw !== 'object') return {};
    const obj = raw as Record<string, unknown>;
    const out: StoredMap = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === 'like' || v === 'dislike') out[k] = v;
    }
    return out;
  }

  private persist(next: StoredMap): void {
    this._map.set(next);
    this.storage.set(KEY, next);
  }
}
