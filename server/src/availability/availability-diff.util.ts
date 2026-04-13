export type AvailabilitySnapshot = {
  readonly tmdbId: number;
  readonly region: string;
  /** Provider names, normalized to lower-case for diffing. */
  readonly providers: readonly string[];
  /** ISO timestamp */
  readonly fetchedAt: string;
};

export type AvailabilityEventType = 'added' | 'leaving' | 'changed';

export type AvailabilityEvent = {
  readonly tmdbId: number;
  readonly region: string;
  readonly type: AvailabilityEventType;
  readonly addedProviders: readonly string[];
  readonly removedProviders: readonly string[];
  /** ISO timestamp (from "next" snapshot) */
  readonly at: string;
};

function normRegion(v: string): string {
  const s = (v ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : 'US';
}

function normProviders(list: readonly string[]): string[] {
  return Array.from(
    new Set(
      (list ?? []).map((x) => String(x).trim().toLowerCase()).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * Deterministic diff between two snapshots.
 *
 * Rules (MVP):
 * - added: providers appear in next but not in prev
 * - leaving: providers disappear (present in prev, absent in next)
 * - changed: both added and removed are non-empty (same event, not two)
 * - no event if providers sets equal
 *
 * Output is stable: provider lists are sorted, region is normalized.
 */
export function diffAvailability(
  prev: AvailabilitySnapshot,
  next: AvailabilitySnapshot,
): AvailabilityEvent | null {
  const tmdbId = next.tmdbId;
  const region = normRegion(next.region || prev.region);
  const a = normProviders(prev.providers);
  const b = normProviders(next.providers);

  const setA = new Set(a);
  const setB = new Set(b);

  const added = b.filter((p) => !setA.has(p));
  const removed = a.filter((p) => !setB.has(p));

  if (!added.length && !removed.length) return null;

  const type: AvailabilityEventType =
    added.length && removed.length
      ? 'changed'
      : added.length
        ? 'added'
        : 'leaving';

  return {
    tmdbId,
    region,
    type,
    addedProviders: added,
    removedProviders: removed,
    at: next.fetchedAt,
  };
}
