import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ServerNotificationItem {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly tmdbId: number | null;
  readonly payload: unknown;
  readonly createdAt: string;
  readonly readAt: string | null;
  readonly ruleId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private readonly http = inject(HttpClient);

  listNotifications(token: string, limit = 50): Observable<{ items: ServerNotificationItem[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<{ items: ServerNotificationItem[] }>('/api/notifications', {
      params,
      headers: this.auth(token),
    });
  }

  downloadRuleCalendarIcs(token: string, ruleId: string, limit = 50): Observable<Blob> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get(`/api/alert-rules/${encodeURIComponent(ruleId)}/calendar.ics`, {
      params,
      headers: this.auth(token),
      responseType: 'blob',
    });
  }

  markRead(token: string, id: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`/api/notifications/${id}/read`, null, {
      headers: this.auth(token),
    });
  }

  runDevAlerts(token: string): Observable<{ ok: boolean; error?: string }> {
    return this.http.post<{ ok: boolean; error?: string }>('/api/alerts/run', null, {
      headers: this.auth(token),
    });
  }

  upsertRule(
    token: string,
    body: {
      name: string;
      enabled?: boolean;
      filters?: Record<string, unknown>;
      channels: {
        inApp: boolean;
        webPush: boolean;
        email: boolean;
        calendar: boolean;
      };
      quietHours?: { start: string; end: string; tz: string } | null;
    },
  ): Observable<{ ok: true; id: string }> {
    return this.http.post<{ ok: true; id: string }>('/api/alert-rules', body, {
      headers: this.auth(token),
    });
  }

  private auth(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token.trim()}` });
  }
}
