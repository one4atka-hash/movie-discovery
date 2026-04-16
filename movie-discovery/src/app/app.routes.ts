import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/movies/feature-search/search.routes').then((r) => r.SEARCH_ROUTES),
  },
  {
    path: 'decide',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/today' },
  },
  {
    path: 'diary',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/diary' },
  },
  {
    path: 'collections',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/lists' },
  },
  {
    path: 'collections/statuses',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/lists/statuses' },
  },
  {
    path: 'watchlist',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/lists/statuses' },
  },
  {
    path: 'inbox',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/inbox' },
  },
  {
    path: 'account',
    loadChildren: () => import('./features/auth/account.routes').then((r) => r.ACCOUNT_ROUTES),
  },
  {
    path: 'u/:slug',
    loadComponent: () =>
      import('./features/public-profile/public-profile-page.component').then(
        (c) => c.PublicProfilePageComponent,
      ),
  },
  {
    path: 'share',
    loadComponent: () =>
      import('./features/share-cards/share-cards-page.component').then(
        (c) => c.ShareCardsPageComponent,
      ),
  },
  {
    path: 'me',
    loadComponent: () =>
      import('./features/me-hub/me-hub-page.component').then((c) => c.MeHubPageComponent),
  },
  {
    path: 'now-playing',
    loadComponent: () =>
      import('./features/movies/feature-search/now-playing-page.component').then(
        (c) => c.NowPlayingPageComponent,
      ),
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./features/movies/feature-search/recommendations-page.component').then(
        (c) => c.RecommendationsPageComponent,
      ),
  },
  {
    path: 'random',
    loadComponent: () =>
      import('./features/movies/feature-search/random-page.component').then(
        (c) => c.RandomPageComponent,
      ),
  },
  {
    path: 'import',
    loadComponent: () =>
      import('./features/import/import-page.component').then((c) => c.ImportPageComponent),
  },
  {
    path: 'search',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/' },
  },
  {
    path: 'movie/:id',
    loadChildren: () =>
      import('./features/movies/feature-details/details.routes').then((r) => r.DETAILS_ROUTES),
  },
  {
    path: 'notifications',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/inbox', queryParams: { tab: 'subs' } },
  },
  {
    path: 'inbox/subscriptions',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/legacy-redirect-page.component').then(
        (c) => c.LegacyRedirectPageComponent,
      ),
    data: { target: '/account/inbox', queryParams: { tab: 'subs' } },
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./features/favorites/favorites-page.component').then((c) => c.FavoritesPageComponent),
  },
  { path: '**', redirectTo: '' },
];
