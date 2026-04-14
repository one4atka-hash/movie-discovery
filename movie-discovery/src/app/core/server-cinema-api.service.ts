import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { StorageService } from './storage.service';

const SERVER_JWT_KEY = 'server.jwt.token.v1';

export interface ServerAuthedUser {
  readonly id: string;
  readonly email: string;
}

export interface ServerAuthResponse {
  readonly token: string;
  readonly user: ServerAuthedUser;
}

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

export interface RefreshMyMovieFeaturesResponse {
  readonly ok: true;
  readonly items: { readonly tmdbId: number; readonly ok: true; readonly updatedAt: string }[];
  readonly errors: { readonly tmdbId: number; readonly error: string }[];
}

export interface EmbeddingsJobItem {
  readonly id: string;
  readonly kind: 'embeddings';
  readonly status: 'queued' | 'running' | 'completed' | 'failed';
  readonly tmdbIds: number[];
  readonly progress: {
    readonly processed: number;
    readonly failed: number;
    readonly total: number;
  };
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly error: string | null;
}

@Injectable({ providedIn: 'root' })
export class ServerCinemaApiService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);

  setToken(token: string): void {
    this.storage.set(SERVER_JWT_KEY, token.trim());
  }

  clearToken(): void {
    this.storage.remove(SERVER_JWT_KEY);
  }

  private token(): string | null {
    const t = this.storage.get<string>(SERVER_JWT_KEY, '')?.trim();
    return t || null;
  }

  private authHeaders(): HttpHeaders | null {
    const t = this.token();
    if (!t) return null;
    return new HttpHeaders({ Authorization: `Bearer ${t}` });
  }

  authRegister(email: string, password: string): Observable<ServerAuthResponse | null> {
    return this.http
      .post<ServerAuthResponse>('/api/auth/register', { email, password })
      .pipe(catchError(() => of(null)));
  }

  authLogin(email: string, password: string): Observable<ServerAuthResponse | null> {
    return this.http
      .post<ServerAuthResponse>('/api/auth/login', { email, password })
      .pipe(catchError(() => of(null)));
  }

  authMe(): Observable<ServerAuthedUser | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .get<ServerAuthedUser>('/api/auth/me', { headers: h })
      .pipe(catchError(() => of(null)));
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

  /** Dev: `POST /api/email/dev/send-test` — requires `DEV_EMAIL_SEND_ENABLED` + SMTP on API. */
  devEmailSendTest(): Observable<{ ok: boolean; error?: string } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .post<{ ok: boolean; error?: string }>('/api/email/dev/send-test', {}, { headers: h })
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

  refreshMyMovieFeatures(input?: {
    limit?: number;
    language?: string;
  }): Observable<RefreshMyMovieFeaturesResponse | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    const limit = input?.limit ?? 30;
    const language = (input?.language ?? '').trim();
    return this.http
      .post<RefreshMyMovieFeaturesResponse>(
        '/api/me/movie-features/refresh',
        { limit, language },
        { headers: h },
      )
      .pipe(catchError(() => of(null)));
  }

  listEmbeddingsJobs(input?: {
    limit?: number;
    offset?: number;
  }): Observable<{ ok: true; items: EmbeddingsJobItem[] } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    return this.http
      .get<{
        ok: true;
        items: EmbeddingsJobItem[];
      }>('/api/movies/features/embeddings/jobs', { headers: h, params })
      .pipe(catchError(() => of(null)));
  }

  runEmbeddingsJob(id: string): Observable<{ ok: true; status: string } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    return this.http
      .post<{
        ok: true;
        status: string;
      }>(`/api/movies/features/embeddings/jobs/${encodeURIComponent(id)}/run`, {}, { headers: h })
      .pipe(catchError(() => of(null)));
  }

  createMyEmbeddingsJob(input?: {
    limit?: number;
  }): Observable<{ ok: true; id: string; tmdbIds: number[] } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    const limit = input?.limit ?? 50;
    return this.http
      .post<{
        ok: true;
        id: string;
        tmdbIds: number[];
      }>('/api/me/movie-features/embeddings/jobs', { limit }, { headers: h })
      .pipe(catchError(() => of(null)));
  }

  previewMyEmbeddingsSeeds(input?: {
    limit?: number;
  }): Observable<{ ok: true; tmdbIds: number[] } | null> {
    const h = this.authHeaders();
    if (!h) return of(null);
    const limit = input?.limit ?? 50;
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<{ ok: true; tmdbIds: number[] }>('/api/me/movie-features/embeddings/seeds', {
        headers: h,
        params,
      })
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
