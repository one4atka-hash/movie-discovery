import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';

import { MovieDetailsPageComponent } from './movie-details-page.component';
import { MovieService } from '../data-access/services/movie.service';
import { I18nService } from '@shared/i18n/i18n.service';

describe('MovieDetailsPageComponent', () => {
  it('creates component', async () => {
    const locale = signal('en-US');
    await TestBed.configureTestingModule({
      imports: [MovieDetailsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: I18nService,
          useValue: {
            tmdbLocale: locale.asReadonly(),
            lang: () => 'en' as const,
            t: (key: string) => key,
          },
        },
        {
          provide: MovieService,
          useValue: {
            getMovie: () => of({ id: 1, title: 'Test' }),
            getMovieVideos: () => of({ id: 1, results: [] }),
            getMovieWatchProviders: () => of({ id: 1, results: {} }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieDetailsPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  }, 30_000);
});
