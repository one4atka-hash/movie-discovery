import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, type Params } from '@angular/router';

import { mergeLegacyRedirectQueryParams, toAbsoluteCommands } from './legacy-route.util';

@Component({
  selector: 'app-legacy-redirect-page',
  standalone: true,
  template: '',
})
export class LegacyRedirectPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const target = String(this.route.snapshot.data['target'] ?? '/');
    const queryParams = mergeLegacyRedirectQueryParams(
      this.route.snapshot.queryParams,
      this.route.snapshot.data['queryParams'] as Params | undefined,
    );

    void this.router.navigate(toAbsoluteCommands(target), {
      queryParams,
      fragment: this.route.snapshot.fragment ?? undefined,
      replaceUrl: true,
    });
  }
}
