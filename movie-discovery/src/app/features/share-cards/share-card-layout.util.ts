export type ShareCardTemplate = 'top10' | 'month_recap' | 'tonight';

export interface ShareMovieRow {
  readonly id: number;
  readonly title: string;
  readonly poster_path: string | null;
}

export interface ShareDiaryRow {
  readonly watchedAt: string;
  readonly title: string;
}

export function top10ShareRows(movies: readonly ShareMovieRow[], limit = 10): ShareMovieRow[] {
  return movies.slice(0, limit);
}

export function monthRecapShareRows(
  entries: readonly ShareDiaryRow[],
  yearMonth: string,
  limit = 10,
): ShareDiaryRow[] {
  const prefix = yearMonth.trim();
  return [...entries]
    .filter((e) => e.watchedAt.startsWith(prefix))
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function tonightShareRows(movies: readonly ShareMovieRow[], limit = 5): ShareMovieRow[] {
  return movies.slice(0, limit);
}

/**
 * Stable content signature for unit tests (ordering rules match row builders).
 */
export function shareCardContentSnapshot(
  template: ShareCardTemplate,
  monthYm: string | null,
  titles: readonly string[],
): string {
  const m = monthYm ?? '';
  return `${template}|${m}|${titles.join('\u241E')}`;
}
