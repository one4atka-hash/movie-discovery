import { parseCsv } from './parse-csv.util';

export type LetterboxdDiaryRow = {
  watchedAt: string;
  title: string;
  year: number | null;
  rating10: number | null;
  tags: string[];
};

/**
 * Parses a minimal subset of Letterboxd "Diary.csv".
 * Expected columns (case-insensitive): Date, Name, Year, Rating, Tags
 *
 * Notes:
 * - Letterboxd rating is usually 0..5 stars (may be empty)
 * - we convert it into 0..10 (x2) to match our diary rating scale
 */
export function parseLetterboxdDiaryCsv(csvText: string): LetterboxdDiaryRow[] {
  const { header, rows } = parseCsv(csvText, { hasHeader: true });
  const h = (header ?? []).map((x) => x.trim().toLowerCase());

  const idx = (name: string) => h.indexOf(name.toLowerCase());
  const iDate = idx('date');
  const iName = idx('name');
  const iYear = idx('year');
  const iRating = idx('rating');
  const iTags = idx('tags');

  if (iDate < 0 || iName < 0) return [];

  return rows
    .map((r) => {
      const watchedAt = normalizeDate(r[iDate] ?? '');
      const title = String(r[iName] ?? '').trim();
      if (!watchedAt || !title) return null;

      const year = toInt(r[iYear] ?? '');
      const rating10 = toRating10(r[iRating] ?? '');
      const tags = String(r[iTags] ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 30);

      return {
        watchedAt,
        title,
        year,
        rating10,
        tags,
      } satisfies LetterboxdDiaryRow;
    })
    .filter((x): x is LetterboxdDiaryRow => Boolean(x));
}

function normalizeDate(v: string): string {
  const s = String(v ?? '').trim();
  // Prefer YYYY-MM-DD; also support M/D/YYYY
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!us) return '';
  const mm = us[1].padStart(2, '0');
  const dd = us[2].padStart(2, '0');
  return `${us[3]}-${mm}-${dd}`;
}

function toInt(v: string): number | null {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toRating10(v: string): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  // Letterboxd uses 0..5; keep flexible but clamp.
  const out = Math.min(10, Math.max(0, Math.round(n * 2 * 10) / 10));
  return out;
}
