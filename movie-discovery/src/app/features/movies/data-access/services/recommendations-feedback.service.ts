import { Injectable, computed, inject, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';

const KEY = 'recs.hidden.v1';

@Injectable({ providedIn: 'root' })
export class RecommendationsFeedbackService {
  private readonly storage = inject(StorageService);
  private readonly _hidden = signal<Set<number>>(this.load());

  readonly hiddenIds = computed(() => new Set(this._hidden()));

  isHidden(tmdbId: number): boolean {
    return this._hidden().has(tmdbId);
  }

  hide(tmdbId: number): void {
    const next = new Set(this._hidden());
    next.add(tmdbId);
    this.persist(next);
  }

  unhide(tmdbId: number): void {
    const next = new Set(this._hidden());
    next.delete(tmdbId);
    this.persist(next);
  }

  clear(): void {
    this.persist(new Set());
  }

  private load(): Set<number> {
    const raw = this.storage.get<unknown>(KEY, []);
    const arr = Array.isArray(raw) ? raw : [];
    const ids = arr.filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0) as number[];
    return new Set(ids);
  }

  private persist(next: Set<number>): void {
    this._hidden.set(next);
    this.storage.set(KEY, [...next]);
  }
}
