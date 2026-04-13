import { Injectable, computed, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import type { DiaryEntry, DiaryLocation } from './diary.model';

const STORAGE_KEY = 'diary.entries.v1';

@Injectable({ providedIn: 'root' })
export class DiaryService {
  private readonly _entries = signal<DiaryEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  readonly sorted = computed(() =>
    [...this._entries()].sort(
      (a, b) => b.watchedAt.localeCompare(a.watchedAt) || b.updatedAt - a.updatedAt,
    ),
  );

  constructor(private readonly storage: StorageService) {
    const raw = this.storage.get<unknown>(STORAGE_KEY, []);
    const list = Array.isArray(raw) ? (raw as unknown[]) : [];
    this._entries.set(
      list
        .filter((x) => Boolean(x && typeof x === 'object'))
        .map((x) => sanitizeEntry(x as Partial<DiaryEntry>))
        .filter(Boolean) as DiaryEntry[],
    );
  }

  upsert(input: {
    id?: string;
    tmdbId?: number | null;
    title: string;
    watchedAt: string;
    location: DiaryLocation;
    rating?: number | null;
    tags?: string[];
    note?: string | null;
  }): DiaryEntry {
    const now = Date.now();
    const id = input.id ?? crypto.randomUUID();
    const normalizedTitle = input.title.trim();
    if (!normalizedTitle) throw new Error('Title is required');
    const watchedAt = normalizeDate(input.watchedAt);
    if (!watchedAt) throw new Error('watchedAt is required');

    const next: DiaryEntry = {
      id,
      tmdbId: input.tmdbId ?? null,
      title: normalizedTitle,
      watchedAt,
      location: input.location,
      rating: clampRating(input.rating),
      tags: normalizeTags(input.tags ?? []),
      note: input.note?.trim() ? input.note.trim() : null,
      createdAt: this._entries().find((e) => e.id === id)?.createdAt ?? now,
      updatedAt: now,
    };

    const cur = this._entries();
    const idx = cur.findIndex((e) => e.id === id);
    const out = idx >= 0 ? [...cur.slice(0, idx), next, ...cur.slice(idx + 1)] : [next, ...cur];
    this.persist(out);
    return next;
  }

  remove(id: string): void {
    const out = this._entries().filter((e) => e.id !== id);
    this.persist(out);
  }

  getById(id: string): DiaryEntry | null {
    return this._entries().find((e) => e.id === id) ?? null;
  }

  private persist(next: DiaryEntry[]): void {
    this._entries.set(next);
    this.storage.set(
      STORAGE_KEY,
      next.map((e) => ({
        ...e,
        tags: e.tags ?? [],
      })),
    );
  }
}

function sanitizeEntry(x: Partial<DiaryEntry>): DiaryEntry | null {
  const title = typeof x.title === 'string' ? x.title.trim() : '';
  const watchedAt = typeof x.watchedAt === 'string' ? normalizeDate(x.watchedAt) : '';
  const location =
    x.location === 'cinema' || x.location === 'streaming' || x.location === 'home'
      ? x.location
      : 'home';
  if (!title || !watchedAt) return null;
  const now = Date.now();
  return {
    id: typeof x.id === 'string' && x.id ? x.id : crypto.randomUUID(),
    tmdbId: typeof x.tmdbId === 'number' ? x.tmdbId : null,
    title,
    watchedAt,
    location,
    providerKey: typeof x.providerKey === 'string' ? x.providerKey : null,
    rating: clampRating(x.rating),
    tags: normalizeTags(
      Array.isArray(x.tags)
        ? ((x.tags as unknown[]).filter((t) => typeof t === 'string') as string[])
        : [],
    ),
    note: typeof x.note === 'string' && x.note.trim() ? x.note.trim() : null,
    createdAt: typeof x.createdAt === 'number' ? x.createdAt : now,
    updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : now,
  };
}

function normalizeDate(v: string): string {
  const s = v.trim();
  // Keep only YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function clampRating(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

function normalizeTags(tags: readonly string[]): string[] {
  const cleaned = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 12);
  return Array.from(new Set(cleaned.map((t) => t.toLowerCase())));
}
