import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { Movie } from '../models/movie.model';
import { MovieStore } from '../store/movie.store';

@Injectable({
  providedIn: 'root'
})
export class MovieFacade {
  private readonly store = inject(MovieStore);

  readonly movies = this.store.movies;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly selectedMovie = this.store.selectedMovie;

  readonly movies$: Observable<Movie[]> = toObservable(this.store.movies);
  readonly loading$: Observable<boolean> = toObservable(this.store.loading);
  readonly error$: Observable<string | null> = toObservable(this.store.error);
  readonly selectedMovie$: Observable<Movie | null> = toObservable(this.store.selectedMovie);

  search(query: string): void {
    this.store.search(query);
  }

  loadMovie(id: number): void {
    this.store.loadMovie(id);
  }

  loadNextPage(): void {
    this.store.loadNextPage();
  }
}

