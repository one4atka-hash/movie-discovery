import type { Movie } from '@features/movies/data-access/models/movie.model';

export type WatchStatus = 'want' | 'watching' | 'watched' | 'dropped' | 'hidden';

export interface WatchStateItem {
  readonly tmdbId: number;
  readonly status: WatchStatus;
  readonly movie: Pick<Movie, 'id' | 'title' | 'poster_path' | 'release_date' | 'vote_average'>;
  readonly updatedAt: number;
}
