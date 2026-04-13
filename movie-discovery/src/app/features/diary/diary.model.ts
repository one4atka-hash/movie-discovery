export type DiaryLocation = 'cinema' | 'streaming' | 'home';

export interface DiaryEntry {
  readonly id: string;
  readonly tmdbId: number | null;
  readonly title: string;
  /** ISO date YYYY-MM-DD */
  readonly watchedAt: string;
  readonly location: DiaryLocation;
  readonly providerKey?: string | null;
  /** 0..10 */
  readonly rating?: number | null;
  readonly tags?: string[];
  readonly note?: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}
