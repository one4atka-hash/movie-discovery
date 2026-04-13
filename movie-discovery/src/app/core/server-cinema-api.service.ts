import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { StorageService } from './storage.service';

const SERVER_JWT_KEY = 'server.jwt.token.v1';

export interface ServerReleaseReminderItem {
  readonly id: string;
  readonly tmdbId: number;
  readonly mediaType: 'movie';
  readonly reminderType: 'theatrical' | 'digital' | 'physical' | 'any';
  readonly window: { daysBefore: number };
  readonly channels: Record<string, boolean>;
  readonly createdAt: string;
  readonly lastNotifiedAt: string | null;
}

export interface MovieReleasesResponse {
  readonly tmdbId: number;
  readonly cached: boolean;
  readonly fetchedAt: string;
  readonly region: string | null;
  readonly results: { readonly iso31661: string; readonly releaseDates: unknown[] }[];
}

export interface MePublicProfile {
  readonly slug: string | null;
  readonly enabled: boolean;
  readonly visibility: 'private' | 'unlisted' | 'public';
  readonly sections: {
    readonly favorites: boolean;
    readonly diary: boolean;
    readonly watchlist: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class ServerCinemaApiService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);

  private token(): string | null {
    const t = this.storage.get<string>(SERVER_JWT_KEY, '')?.trim();
    return t || null;
  }

  private authHeaders(): HttpHeaders | null {
    const t = this.token();
    if (!t) return null;
    return new HttpHeaders({ Authorization: `Bearer ${t}` });
  }

  getMovieReleases(tmdbId: number, region?: string): Observable<MovieReleasesResponse | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    let params = new HttpParams();
    if (region?.trim()) params = params.set('region', region.trim().toUpperCase());
    return this.http
      .get<MovieReleasesResponse>(`/api/movies/${tmdbId}/releases`, {
        headers: h,
        params,
      })
      .pipe(catchError(() => of(null)));
  }

  listReleaseReminders(): Observable<{ items: ServerReleaseReminderItem[] } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .get<{ items: ServerReleaseReminderItem[] }>('/api/release-reminders', { headers: h })
      .pipe(catchError(() => of(null)));
  }

  createReleaseReminder(body: {
    tmdbId: number;
    mediaType: 'movie';
    reminderType: ServerReleaseReminderItem['reminderType'];
    window: { daysBefore: number };
    channels: Record<string, boolean>;
  }): Observable<{ ok: boolean; reminder: ServerReleaseReminderItem } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .post<{
        ok: boolean;
        reminder: ServerReleaseReminderItem;
      }>('/api/release-reminders', body, { headers: h })
      .pipe(catchError(() => of(null)));
  }

  deleteReleaseReminder(id: string): Observable<{ ok: boolean } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .delete<{ ok: boolean }>(`/api/release-reminders/${id}`, { headers: h })
      .pipe(catchError(() => of(null)));
  }

  getMePublicProfile(): Observable<MePublicProfile | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .get<MePublicProfile>('/api/me/public-profile', { headers: h })
      .pipe(catchError(() => of(null)));
  }

  putMePublicProfile(body: MePublicProfile): Observable<{ ok: boolean } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .put<{ ok: boolean }>('/api/me/public-profile', body, { headers: h })
      .pipe(catchError(() => of(null)));
  }

  getPublicUserBySlug(slug: string): Observable<Record<string, unknown> | null> {
    return this.http.get<Record<string, unknown>>(`/api/u/${encodeURIComponent(slug)}`).pipe(
      catchError((e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 404) return of(null);
        return of(null);
      }),
    );
  }
}
