import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeAll } from 'vitest';

import { MovieSearchPageComponent } from './movie-search-page.component';
import { MovieService } from '../data-access/services/movie.service';

describe('MovieSearchPageComponent', () => {
  beforeAll(() => {
    (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver =
      class {
        observe(): void {}
        disconnect(): void {}
      } as unknown as typeof IntersectionObserver;
  });

  it('creates component', async () => {
    await TestBed.configureTestingModule({
      imports: [MovieSearchPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: MovieService,
          useValue: {
            searchMovies: () => of({ page: 1, results: [], total_pages: 1, total_results: 0 }),
            getPopularMovies: () => of({ page: 1, results: [], total_pages: 1, total_results: 0 }),
            getNowPlayingMovies: () =>
              of({ page: 1, results: [], total_pages: 1, total_results: 0 }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieSearchPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  }, 30_000);
});
