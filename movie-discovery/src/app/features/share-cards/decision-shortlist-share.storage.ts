import type { ShareMovieRow } from './share-card-layout.util';

const KEY = 'cinema.share.decisionCandidates.v1';

export interface StoredDecisionSharePayload {
  readonly savedAt: number;
  readonly movies: readonly ShareMovieRow[];
}

export function saveDecisionCandidatesForShare(
  movies: readonly { id: number; title: string; poster_path: string | null }[],
): void {
  try {
    const payload: StoredDecisionSharePayload = {
      savedAt: Date.now(),
      movies: movies.slice(0, 12).map((m) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? null,
      })),
    };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function loadDecisionCandidatesForShare(): StoredDecisionSharePayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const savedAt = typeof o['savedAt'] === 'number' ? o['savedAt'] : 0;
    const moviesRaw = o['movies'];
    if (!Array.isArray(moviesRaw)) return null;
    const movies: ShareMovieRow[] = moviesRaw
      .filter((x) => x && typeof x === 'object')
      .map((x) => x as Record<string, unknown>)
      .map((x) => ({
        id: typeof x['id'] === 'number' ? x['id'] : Number(x['id']) || 0,
        title: typeof x['title'] === 'string' ? x['title'] : '',
        poster_path: typeof x['poster_path'] === 'string' ? x['poster_path'] : null,
      }))
      .filter((m) => m.id > 0 && m.title.length > 0);
    return { savedAt, movies };
  } catch {
    return null;
  }
}
