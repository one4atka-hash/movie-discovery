import type { Movie } from '@features/movies/data-access/models/movie.model';

export function isReleased(releaseDate: string | null | undefined): boolean {
  if (!releaseDate) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const nowStr = `${yyyy}-${mm}-${dd}`;
  return releaseDate <= nowStr;
}

/** Same rules as movie details “Follow release”. */
export function canFollowRelease(m: Movie): boolean {
  if (m.release_date && !isReleased(m.release_date)) return true;
  const s = (m.status ?? '').toLowerCase();
  if (!s) return false;
  if (s === 'released' || s === 'canceled' || s === 'cancelled') return false;
  return s === 'rumored' || s === 'planned' || s === 'in production' || s === 'post production';
}
