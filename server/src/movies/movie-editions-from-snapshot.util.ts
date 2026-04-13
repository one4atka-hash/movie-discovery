import { z } from 'zod';

const CountryBlockSchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(z.unknown()),
});

const SnapshotSchema = z.object({
  results: z.array(CountryBlockSchema),
});

const ReleaseDateEntrySchema = z.object({
  type: z.number().optional(),
});

const TYPE_INFO: Record<number, { key: string; label: string }> = {
  1: { key: 'premiere', label: 'Premiere' },
  2: { key: 'theatrical_limited', label: 'Theatrical (limited)' },
  3: { key: 'theatrical', label: 'Theatrical' },
  4: { key: 'digital', label: 'Digital' },
  5: { key: 'physical', label: 'Physical' },
  6: { key: 'tv', label: 'TV' },
};

export type MovieEditionItem = {
  editionKey: string;
  label: string;
  sortOrder: number;
  source: 'heuristic' | 'manual';
  meta?: Record<string, unknown> | null;
};

export type MovieEditionManualRow = {
  edition_key: string;
  label: string;
  sort_order: number;
  meta: unknown;
};

/** Derive distinct TMDB release-types present in a cached release_dates payload. */
export function heuristicEditionsFromPayload(
  payload: unknown,
): MovieEditionItem[] {
  const parsed = SnapshotSchema.safeParse(payload);
  if (!parsed.success) return [];

  const seen = new Set<number>();
  for (const block of parsed.data.results) {
    for (const rd of block.release_dates) {
      const one = ReleaseDateEntrySchema.safeParse(rd);
      if (!one.success) continue;
      const t = one.data.type;
      if (t === undefined) continue;
      seen.add(t);
    }
  }

  const out: MovieEditionItem[] = [];
  const order = [1, 2, 3, 4, 5, 6];
  for (const t of order) {
    if (!seen.has(t)) continue;
    const info = TYPE_INFO[t];
    if (!info) continue;
    out.push({
      editionKey: info.key,
      label: info.label,
      sortOrder: t,
      source: 'heuristic',
      meta: { tmdbReleaseType: t },
    });
  }
  return out;
}

/** Manual rows override label/sort/meta for the same editionKey; extra manual rows are appended. */
export function mergeHeuristicWithManual(
  heuristic: MovieEditionItem[],
  manual: readonly MovieEditionManualRow[],
): MovieEditionItem[] {
  const manualMap = new Map(manual.map((m) => [m.edition_key, m] as const));
  const usedManual = new Set<string>();
  const merged: MovieEditionItem[] = [];

  for (const h of heuristic) {
    const ov = manualMap.get(h.editionKey);
    if (ov) {
      usedManual.add(ov.edition_key);
      merged.push({
        editionKey: ov.edition_key,
        label: ov.label,
        sortOrder: ov.sort_order,
        source: 'manual',
        meta:
          ov.meta != null && typeof ov.meta === 'object'
            ? (ov.meta as Record<string, unknown>)
            : (h.meta ?? null),
      });
    } else {
      merged.push(h);
    }
  }

  for (const m of manual) {
    if (usedManual.has(m.edition_key)) continue;
    merged.push({
      editionKey: m.edition_key,
      label: m.label,
      sortOrder: m.sort_order,
      source: 'manual',
      meta:
        m.meta != null && typeof m.meta === 'object'
          ? (m.meta as Record<string, unknown>)
          : null,
    });
  }

  merged.sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.editionKey.localeCompare(b.editionKey),
  );
  return merged;
}
