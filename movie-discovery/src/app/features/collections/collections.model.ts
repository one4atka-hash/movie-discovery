export type CollectionVisibility = 'private' | 'unlisted' | 'public';

export interface CollectionItem {
  readonly tmdbId: number | null;
  readonly title: string;
  readonly note?: string | null;
  readonly createdAt: number;
}

export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly visibility: CollectionVisibility;
  readonly items: CollectionItem[];
  readonly createdAt: number;
  readonly updatedAt: number;
}
