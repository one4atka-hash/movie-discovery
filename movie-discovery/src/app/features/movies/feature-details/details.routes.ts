import { Routes } from '@angular/router';

export const DETAILS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movie-details-page.component').then((m) => m.MovieDetailsPageComponent),
  },
];
