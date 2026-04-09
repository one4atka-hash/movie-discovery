import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/movies/feature-search/search.routes').then((r) => r.SEARCH_ROUTES)
  },
  {
    path: 'account',
    loadComponent: () => import('./features/auth/account-page.component').then((c) => c.AccountPageComponent)
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notifications-page.component').then((c) => c.NotificationsPageComponent),
    canActivate: [() => import('./features/auth/auth.guard').then((g) => g.authGuard)]
  },
  {
    path: 'search',
    pathMatch: 'full',
    redirectTo: ''
  },
  {
    path: 'movie/:id',
    loadChildren: () =>
      import('./features/movies/feature-details/details.routes').then((r) => r.DETAILS_ROUTES)
  },
  {
    path: 'favorites',
    loadChildren: () =>
      import('./features/movies/feature-favorites/favorites.routes').then((r) => r.FAVORITES_ROUTES)
  },
  { path: '**', redirectTo: '' }
];
