import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { I18nService } from '@shared/i18n/i18n.service';
import { AuthService } from '@features/auth/auth.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { WatchStateService } from '@features/watchlist/watch-state.service';
import { FavoritesService } from '../../data-access/services/favorites.service';
import { MovieReactionsService } from '../../data-access/services/movie-reactions.service';
import { MovieCardComponent } from './movie-card.component';

describe('MovieCardComponent', () => {
  const movie = {
    id: 101,
    title: 'Arrival',
    release_date: '2016-11-11',
    vote_average: 7.9,
    overview: 'First contact drama.',
    poster_path: '/arrival.jpg',
  };

  async function setup(detailLink: readonly (string | number)[] | null = null) {
    const favorites = {
      has: vi.fn(() => false),
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    };

    const reactions = {
      reactionFor: vi.fn(() => signal<null | 'like' | 'dislike'>(null).asReadonly()),
      toggle: vi.fn(),
      clear: vi.fn(),
    };

    const subs = {
      upsert: vi.fn(),
    };

    const watchState = {
      getStatus: vi.fn(() => null),
      cycle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MovieCardComponent],
      providers: [
        provideRouter([]),
        {
          provide: I18nService,
          useValue: {
            t: (key: string) => key,
          },
        },
        {
          provide: FavoritesService,
          useValue: favorites,
        },
        {
          provide: MovieReactionsService,
          useValue: reactions,
        },
        {
          provide: ReleaseSubscriptionsService,
          useValue: subs,
        },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: 'user-1' }),
          },
        },
        {
          provide: WatchStateService,
          useValue: watchState,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MovieCardComponent);
    fixture.componentRef.setInput('movie', movie);
    fixture.componentRef.setInput('detailLink', detailLink);
    fixture.detectChanges();

    return { fixture, favorites, reactions, watchState };
  }

  it('renders title as router link when detailLink is provided', async () => {
    const { fixture } = await setup(['/movie', movie.id]);

    const titleLink = fixture.nativeElement.querySelector(
      '.card__titleLink',
    ) as HTMLAnchorElement | null;

    expect(titleLink).toBeTruthy();
    expect(titleLink?.tagName).toBe('A');
    expect(titleLink?.textContent).toContain('Arrival');
  });

  it('renders plain title when detailLink is absent', async () => {
    const { fixture } = await setup(null);

    expect(fixture.nativeElement.querySelector('.card__titleLink')).toBeNull();
    expect(fixture.nativeElement.querySelector('.card__title')?.textContent).toContain('Arrival');
  });

  it('keeps watch status action as separate button', async () => {
    const { fixture, watchState } = await setup(['/movie', movie.id]);

    const watchButton = fixture.nativeElement.querySelector(
      '[data-testid="movie-card-watch-cycle"]',
    ) as HTMLButtonElement;

    watchButton.click();
    fixture.detectChanges();

    expect(watchState.cycle).toHaveBeenCalledWith(movie);
  });
});
