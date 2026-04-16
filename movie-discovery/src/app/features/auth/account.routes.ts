import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./account-shell-page.component').then((c) => c.AccountShellPageComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        loadComponent: () =>
          import('../decision/decision-page.component').then((c) => c.DecisionPageComponent),
      },
      {
        path: 'diary',
        loadComponent: () =>
          import('../diary/diary-page.component').then((c) => c.DiaryPageComponent),
      },
      {
        path: 'lists',
        loadComponent: () =>
          import('../collections/lists-hub-page.component').then((c) => c.ListsHubPageComponent),
      },
      {
        path: 'lists/statuses',
        loadComponent: () =>
          import('../collections/lists-hub-page.component').then((c) => c.ListsHubPageComponent),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('../inbox/inbox-page.component').then((c) => c.InboxPageComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./account-page.component').then((c) => c.AccountPageComponent),
      },
    ],
  },
];
