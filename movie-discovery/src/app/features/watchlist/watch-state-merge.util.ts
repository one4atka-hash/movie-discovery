import type { WatchStateItem } from './watch-state.model';

/**
 * Merge local optimistic state with server truth.
 *
 * Rule (MVP):
 * - If server has a newer updatedAt: server wins.
 * - If local is newer (optimistic action after last sync): local wins.
 * - If same timestamp: local wins (stable UI).
 */
export function mergeWatchState(
  local: readonly WatchStateItem[],
  server: readonly WatchStateItem[],
): WatchStateItem[] {
  const byId = new Map<number, WatchStateItem>();

  for (const it of server) byId.set(it.tmdbId, it);
  for (const it of local) {
    const s = byId.get(it.tmdbId);
    if (!s) {
      byId.set(it.tmdbId, it);
      continue;
    }
    byId.set(it.tmdbId, it.updatedAt >= s.updatedAt ? it : s);
  }

  return [...byId.values()].sort(
    (a, b) => b.updatedAt - a.updatedAt || a.movie.title.localeCompare(b.movie.title),
  );
}
