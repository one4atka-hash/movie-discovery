import { z } from 'zod';

const ReleaseDateEntrySchema = z.object({
  type: z.number().optional(),
  release_date: z.string().optional(),
});

const CountryBlockSchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(z.unknown()),
});

const SnapshotSchema = z.object({
  results: z.array(CountryBlockSchema),
});

function tmdbTypesForReminder(
  reminderType: 'theatrical' | 'digital' | 'physical' | 'any',
): number[] | null {
  switch (reminderType) {
    case 'theatrical':
      return [1, 2, 3];
    case 'digital':
      return [4];
    case 'physical':
      return [5];
    case 'any':
      return null;
    default:
      return null;
  }
}

/** First 10 chars YYYY-MM-DD from TMDB release_date string. */
function ymdFromTmdbDate(raw: string): string | null {
  const s = raw.trim();
  if (s.length < 10) return null;
  const ymd = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/**
 * Earliest matching release calendar date (YYYY-MM-DD) for a region, from cached TMDB release_dates payload.
 */
export function releaseDateYmdFromSnapshot(
  payload: unknown,
  region: string,
  reminderType: 'theatrical' | 'digital' | 'physical' | 'any',
): string | null {
  const parsed = SnapshotSchema.safeParse(payload);
  if (!parsed.success) return null;

  const regionUpper = region.trim().toUpperCase();
  const block = parsed.data.results.find((r) => r.iso_3166_1 === regionUpper);
  if (!block) return null;

  const types = tmdbTypesForReminder(reminderType);
  const dates: string[] = [];

  for (const rd of block.release_dates) {
    const one = ReleaseDateEntrySchema.safeParse(rd);
    if (!one.success) continue;
    const t = one.data.type;
    const raw = one.data.release_date;
    if (!raw) continue;
    const ymd = ymdFromTmdbDate(raw);
    if (!ymd) continue;
    if (types === null) {
      dates.push(ymd);
    } else if (t !== undefined && types.includes(t)) {
      dates.push(ymd);
    }
  }

  if (!dates.length) return null;
  return dates.sort()[0];
}
