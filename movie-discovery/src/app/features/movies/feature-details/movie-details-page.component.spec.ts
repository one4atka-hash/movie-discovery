import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';

import { MovieDetailsPageComponent } from './movie-details-page.component';
import { MovieService } from '../data-access/services/movie.service';

describe('MovieDetailsPageComponent', () => {
  it(
    'creates component',
    async () => {
    await TestBed.configureTestingModule({
      imports: [MovieDetailsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: MovieService,
          useValue: {
            getMovieVideos: () => of({ id: 1, results: [] })
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { movie: { id: 1, title: 'Test' } } },
            paramMap: of(convertToParamMap({ id: '1' }))
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieDetailsPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    },
    30_000
  );
});

