import type { Movie } from '@features/movies/data-access/models/movie.model';

export type DecisionMode = 'top5' | 'roulette';

export interface DecisionConstraints {
  readonly maxMinutes: number | null;
  readonly genre: 'thriller' | 'comedy' | 'drama' | null;
  /** If true, try to keep only candidates available on user's streaming services (best-effort, MVP). */
  readonly onlyMyServices: boolean;
  readonly region: string;
  readonly myProviders: readonly string[];
}

export function pickWinner(candidates: readonly Movie[], mode: DecisionMode): Movie | null {
  if (!candidates.length) return null;
  if (mode === 'top5') return candidates[0] ?? null;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] ?? null;
}
