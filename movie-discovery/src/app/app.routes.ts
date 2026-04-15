import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/movies/feature-search/search.routes').then((r) => r.SEARCH_ROUTES),
  },
  {
    path: 'decide',
    loadComponent: () =>
      import('./features/decision/decision-page.component').then((c) => c.DecisionPageComponent),
  },
  {
    path: 'diary',
    loadComponent: () =>
      import('./features/diary/diary-page.component').then((c) => c.DiaryPageComponent),
  },
  {
    path: 'collections',
    loadComponent: () =>
      import('./features/collections/lists-hub-page.component').then(
        (c) => c.ListsHubPageComponent,
      ),
  },
  {
    path: 'collections/statuses',
    loadComponent: () =>
      import('./features/collections/lists-hub-page.component').then(
        (c) => c.ListsHubPageComponent,
      ),
  },
  {
    path: 'watchlist',
    pathMatch: 'full',
    redirectTo: 'collections/statuses',
  },
  {
    path: 'inbox',
    loadComponent: () =>
      import('./features/inbox/inbox-page.component').then((c) => c.InboxPageComponent),
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./features/auth/account-page.component').then((c) => c.AccountPageComponent),
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
    redirectTo: '',
  },
  {
    path: 'movie/:id',
    loadChildren: () =>
      import('./features/movies/feature-details/details.routes').then((r) => r.DETAILS_ROUTES),
  },
  {
    path: 'notifications',
    pathMatch: 'full',
    redirectTo: 'inbox/subscriptions',
  },
  {
    path: 'inbox/subscriptions',
    loadComponent: () =>
      import('./features/inbox/inbox-page.component').then((c) => c.InboxPageComponent),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./features/favorites/favorites-page.component').then((c) => c.FavoritesPageComponent),
  },
  { path: '**', redirectTo: '' },
];
