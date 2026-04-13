import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

export interface StreamingCatalogProvider {
  readonly id: number;
  readonly name: string;
  readonly logoPath: string | null;
  readonly displayPriority: number | null;
}

@Injectable({ providedIn: 'root' })
export class StreamingCatalogService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<StreamingCatalogProvider[]>>();

  listProviders(region: string): Observable<StreamingCatalogProvider[]> {
    const cc = (region || 'US').trim().toUpperCase();
    const cached = this.cache.get(cc);
    if (cached) return cached;

    const params = new HttpParams().set('region', cc);
    const req$ = this.http
      .get<{ items: StreamingCatalogProvider[] }>('/api/streaming/providers', { params })
      .pipe(
        map((r) => r.items ?? []),
        map((items) =>
          [...items].sort((a, b) => (a.displayPriority ?? 999) - (b.displayPriority ?? 999)),
        ),
        shareReplay(1),
      );

    this.cache.set(cc, req$);
    return req$;
  }
}
