import { Injectable, computed, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import type { Collection, CollectionItem, CollectionVisibility } from './collections.model';

const STORAGE_KEY = 'collections.v1';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly _collections = signal<Collection[]>([]);
  readonly collections = this._collections.asReadonly();

  readonly sorted = computed(() =>
    [...this._collections()].sort(
      (a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name),
    ),
  );

  constructor(private readonly storage: StorageService) {
    const raw = this.storage.get<unknown>(STORAGE_KEY, []);
    const list = Array.isArray(raw) ? (raw as unknown[]) : [];
    this._collections.set(
      list
        .filter((x) => Boolean(x && typeof x === 'object'))
        .map((x) => sanitizeCollection(x as Partial<Collection>))
        .filter(Boolean) as Collection[],
    );
  }

  upsertCollection(input: {
    id?: string;
    name: string;
    description?: string | null;
    visibility: CollectionVisibility;
  }): Collection {
    const now = Date.now();
    const id = input.id ?? crypto.randomUUID();
    const name = input.name.trim();
    if (!name) throw new Error('name required');
    const cur = this._collections();
    const existing = cur.find((c) => c.id === id);
    const next: Collection = {
      id,
      name,
      description: input.description?.trim() ? input.description.trim() : null,
      visibility: input.visibility,
      items: existing?.items ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const idx = cur.findIndex((c) => c.id === id);
    const out = idx >= 0 ? [...cur.slice(0, idx), next, ...cur.slice(idx + 1)] : [next, ...cur];
    this.persist(out);
    return next;
  }

  removeCollection(id: string): void {
    this.persist(this._collections().filter((c) => c.id !== id));
  }

  getById(id: string): Collection | null {
    return this._collections().find((c) => c.id === id) ?? null;
  }

  addItem(
    collectionId: string,
    item: { tmdbId: number | null; title: string; note?: string | null },
  ): void {
    const cur = this._collections();
    const idx = cur.findIndex((c) => c.id === collectionId);
    if (idx < 0) return;
    const c = cur[idx]!;
    const title = item.title.trim();
    if (!title) throw new Error('title required');
    const nextItem: CollectionItem = {
      tmdbId: item.tmdbId,
      title,
      note: item.note?.trim() ? item.note.trim() : null,
      createdAt: Date.now(),
    };
    const outItems = [nextItem, ...c.items].slice(0, 300);
    const updated: Collection = { ...c, items: outItems, updatedAt: Date.now() };
    this.persist([...cur.slice(0, idx), updated, ...cur.slice(idx + 1)]);
  }

  removeItem(collectionId: string, createdAt: number): void {
    const cur = this._collections();
    const idx = cur.findIndex((c) => c.id === collectionId);
    if (idx < 0) return;
    const c = cur[idx]!;
    const updated: Collection = {
      ...c,
      items: c.items.filter((i) => i.createdAt !== createdAt),
      updatedAt: Date.now(),
    };
    this.persist([...cur.slice(0, idx), updated, ...cur.slice(idx + 1)]);
  }

  private persist(next: Collection[]): void {
    this._collections.set(next);
    this.storage.set(STORAGE_KEY, next);
  }
}

function sanitizeCollection(x: Partial<Collection>): Collection | null {
  const now = Date.now();
  const name = typeof x.name === 'string' ? x.name.trim() : '';
  if (!name) return null;
  const visibility: CollectionVisibility =
    x.visibility === 'public' || x.visibility === 'unlisted' || x.visibility === 'private'
      ? x.visibility
      : 'private';
  const itemsRaw = Array.isArray(x.items) ? (x.items as unknown[]) : [];
  const items: CollectionItem[] = itemsRaw
    .filter((i) => Boolean(i && typeof i === 'object'))
    .map((i) => sanitizeItem(i as Partial<CollectionItem>))
    .filter(Boolean) as CollectionItem[];
  return {
    id: typeof x.id === 'string' && x.id ? x.id : crypto.randomUUID(),
    name,
    description:
      typeof x.description === 'string' && x.description.trim() ? x.description.trim() : null,
    visibility,
    items,
    createdAt: typeof x.createdAt === 'number' ? x.createdAt : now,
    updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : now,
  };
}

function sanitizeItem(x: Partial<CollectionItem>): CollectionItem | null {
  const title = typeof x.title === 'string' ? x.title.trim() : '';
  if (!title) return null;
  return {
    tmdbId: typeof x.tmdbId === 'number' ? x.tmdbId : null,
    title,
    note: typeof x.note === 'string' && x.note.trim() ? x.note.trim() : null,
    createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
  };
}
