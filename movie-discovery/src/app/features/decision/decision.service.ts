import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { MovieService } from '@features/movies/data-access/services/movie.service';
import type { Movie } from '@features/movies/data-access/models/movie.model';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import type { DecisionConstraints } from './decision.util';

@Injectable({ providedIn: 'root' })
export class DecisionService {
  private readonly movies = inject(MovieService);
  private readonly favorites = inject(FavoritesService);

  /**
   * MVP candidate strategy:
   * - if you have favorites: take up to 2 seed favorites, pull TMDB recommendations, merge and de-dup
   * - else: fallback to popular/now_playing
   *
   * Constraints are applied client-side to keep this fast and decoupled.
   */
  buildCandidates(constraints: DecisionConstraints): Observable<Movie[]> {
    const seeds = this.favorites
      .favorites()
      .slice(0, 2)
      .map((m) => m.id);

    const base$ =
      seeds.length > 0
        ? this.movies.getMovieRecommendations(seeds[0]!, 1).pipe(
            switchMap((a) => {
              if (seeds.length < 2) return of(a.results ?? []);
              return this.movies
                .getMovieRecommendations(seeds[1]!, 1)
                .pipe(map((b) => [...(a.results ?? []), ...(b.results ?? [])]));
            }),
          )
        : this.movies.getPopularMovies(1).pipe(map((r) => r.results ?? []));

    return base$.pipe(
      map((arr) => dedupeById(arr)),
      map((arr) => applyConstraints(arr, constraints)),
      map((arr) => arr.slice(0, 20)),
      catchError(() => of([])),
    );
  }
}

function dedupeById(arr: readonly Movie[]): Movie[] {
  const seen = new Set<number>();
  const out: Movie[] = [];
  for (const m of arr) {
    const id = m?.id;
    if (!Number.isFinite(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(m);
  }
  return out;
}

function applyConstraints(arr: readonly Movie[], c: DecisionConstraints): Movie[] {
  // We only have runtime after calling /movie/:id; for MVP we filter by genre keyword in overview/title heuristics.
  // Runtime constraint is applied later when we enrich candidates (next iteration).
  const genre = c.genre;
  const maxMinutes = c.maxMinutes;
  const genrePred = (m: Movie) => {
    if (!genre) return true;
    const text = `${m.title ?? ''} ${m.overview ?? ''}`.toLowerCase();
    if (genre === 'thriller') return text.includes('thriller') || text.includes('триллер');
    if (genre === 'comedy') return text.includes('comedy') || text.includes('комед');
    return text.includes('drama') || text.includes('драм');
  };

  // maxMinutes: placeholder (kept for UI contract); applied when runtime is available.
  const maxMinutesPred = (_m: Movie) => (maxMinutes ? true : true);

  return arr.filter((m) => genrePred(m) && maxMinutesPred(m));
}
