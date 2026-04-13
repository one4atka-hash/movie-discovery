import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ImportKind = 'diary' | 'watch_state' | 'favorites';
export type ImportFormat = 'json' | 'csv';

export interface ImportJobCreateResponse {
  readonly ok: true;
  readonly id: string;
  readonly createdAt: string;
}

export interface ImportJobGetResponse {
  readonly id: string;
  readonly kind: ImportKind;
  readonly format: ImportFormat;
  readonly status: 'created' | 'uploaded' | 'parsed' | 'preview' | 'applied' | 'failed';
  readonly error: string | null;
  readonly meta: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ImportPreviewResponse {
  readonly ok: true;
  readonly totalRows: number;
  readonly okRows: number;
  readonly errorRows: number;
}

export interface ImportRowsResponse {
  readonly ok: true;
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly rows: {
    readonly rowN: number;
    readonly status: 'pending' | 'ok' | 'conflict' | 'error';
    readonly mapped: unknown;
    readonly error: string | null;
  }[];
}

export interface ImportConflictsResponse {
  readonly ok: true;
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly conflicts: {
    readonly id: string;
    readonly entity: string;
    readonly key: string;
    readonly server: unknown;
    readonly incoming: unknown;
    readonly resolution: unknown;
    readonly createdAt: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private readonly http = inject(HttpClient);

  create(token: string, input: { kind: ImportKind; format: ImportFormat; payload: string }) {
    return this.http.post<ImportJobCreateResponse>(
      '/api/imports',
      {
        kind: input.kind,
        format: input.format,
        payload: input.payload,
      },
      { headers: authHeaders(token) },
    );
  }

  get(token: string, id: string) {
    return this.http.get<ImportJobGetResponse>(`/api/imports/${id}`, {
      headers: authHeaders(token),
    });
  }

  preview(token: string, id: string): Observable<ImportPreviewResponse> {
    return this.http.post<ImportPreviewResponse>(`/api/imports/${id}/preview`, null, {
      headers: authHeaders(token),
    });
  }

  rows(
    token: string,
    id: string,
    input: { offset: number; limit: number },
  ): Observable<ImportRowsResponse> {
    const params = new HttpParams()
      .set('offset', String(input.offset))
      .set('limit', String(input.limit));
    return this.http.get<ImportRowsResponse>(`/api/imports/${id}/rows`, {
      headers: authHeaders(token),
      params,
    });
  }

  conflicts(
    token: string,
    id: string,
    input: { offset: number; limit: number },
  ): Observable<ImportConflictsResponse> {
    const params = new HttpParams()
      .set('offset', String(input.offset))
      .set('limit', String(input.limit));
    return this.http.get<ImportConflictsResponse>(`/api/imports/${id}/conflicts`, {
      headers: authHeaders(token),
      params,
    });
  }

  resolveRow(
    token: string,
    id: string,
    rowN: number,
    input: {
      status?: 'pending' | 'ok' | 'conflict' | 'error';
      mapped?: unknown;
      error?: string | null;
    },
  ): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`/api/imports/${id}/rows/${rowN}/resolve`, input, {
      headers: authHeaders(token),
    });
  }

  apply(token: string, id: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`/api/imports/${id}/apply`, null, {
      headers: authHeaders(token),
    });
  }
}

function authHeaders(token: string): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${token.trim()}` });
}
