import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ExportKind = 'diary' | 'watch_state' | 'favorites';
export type ExportFormat = 'csv' | 'json';

@Injectable({ providedIn: 'root' })
export class ExportsApiService {
  private readonly http = inject(HttpClient);

  download(token: string, input: { kind: ExportKind; format: ExportFormat }): Observable<Blob> {
    const params = new HttpParams().set('kind', input.kind).set('format', input.format);
    return this.http.get('/api/exports', {
      params,
      headers: authHeaders(token),
      responseType: 'blob',
    });
  }
}

function authHeaders(token: string): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${token.trim()}` });
}
