/** TMDB-like genre entry from movie_features.genres jsonb. */
export type GenreEntry = { id: number; name: string };

/**
 * Aggregate genre counts from multiple movie genre arrays (order-insensitive, stable sort by id).
 */
export function aggregateGenreCounts(
  genreArrays: readonly unknown[],
): Map<number, { name: string; count: number }> {
  const map = new Map<number, { name: string; count: number }>();

  for (const raw of genreArrays) {
    const list = parseGenreArray(raw);
    for (const g of list) {
      const cur = map.get(g.id);
      if (cur) {
        cur.count += 1;
        if (!cur.name && g.name) cur.name = g.name;
      } else {
        map.set(g.id, { name: g.name, count: 1 });
      }
    }
  }

  return map;
}

export function countsToWeights(
  map: Map<number, { name: string; count: number }>,
): { id: number; name: string; weight: number }[] {
  let total = 0;
  for (const v of map.values()) total += v.count;
  if (total <= 0) return [];

  return [...map.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name || String(id),
      weight: Math.round((v.count / total) * 1000) / 1000,
    }))
    .sort((a, b) => b.weight - a.weight || a.id - b.id);
}

function parseGenreArray(raw: unknown): GenreEntry[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: GenreEntry[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === 'number' ? o.id : Number(o.id);
    if (!Number.isFinite(id)) continue;
    const name = typeof o.name === 'string' ? o.name : '';
    out.push({ id, name });
  }
  return out;
}
