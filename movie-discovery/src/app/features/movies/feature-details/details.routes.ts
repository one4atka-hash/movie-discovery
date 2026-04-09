import { Routes } from '@angular/router';
import { movieResolver } from './movie.resolver';

export const DETAILS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movie-details-page.component').then((m) => m.MovieDetailsPageComponent),
    resolve: {
      movie: movieResolver
    }
  }
];

