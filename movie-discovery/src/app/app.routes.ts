import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/movies/feature-search/search.routes').then((r) => r.SEARCH_ROUTES),
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./features/auth/account-page.component').then((c) => c.AccountPageComponent),
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
  { path: 'notifications', pathMatch: 'full', redirectTo: '' },
  { path: 'favorites', pathMatch: 'full', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
