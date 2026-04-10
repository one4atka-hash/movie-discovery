import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { ConfigService } from './config.service';
import { parseTmdbJsonText } from './tmdb-http.util';

/** Подмножество ответа `/configuration/primary_translations`, если API недоступен. */
const FALLBACK_PRIMARY_TRANSLATIONS: readonly string[] = [
  'en-US',
  'en-GB',
  'ru-RU',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-BR',
  'pt-PT',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'zh-TW',
  'pl-PL',
  'uk-UA',
  'tr-TR',
  'ar-SA',
  'hi-IN',
  'nl-NL',
  'sv-SE',
  'da-DK',
  'fi-FI',
  'nb-NO',
  'cs-CZ',
  'hu-HU',
  'ro-RO',
  'el-GR',
  'he-IL',
  'th-TH',
  'vi-VN',
  'id-ID',
];

@Injectable({ providedIn: 'root' })
export class TmdbConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private readonly _primary = signal<string[] | null>(null);
  private load$?: Observable<string[]>;

  /** Список локалей TMDB (primary_translations) или fallback. */
  readonly primaryTranslations = computed(
    () => this._primary() ?? [...FALLBACK_PRIMARY_TRANSLATIONS],
  );

  /**
   * Загружает `GET /configuration/primary_translations` (как на сайте TMDB).
   * Повторные вызовы отдают кэш.
   */
  loadPrimaryTranslations(): Observable<string[]> {
    const cached = this._primary();
    if (cached?.length) {
      return of(cached);
    }
    if (this.load$) {
      return this.load$;
    }

    const key = this.config.api.apiKey;
    if (!key) {
      this._primary.set([...FALLBACK_PRIMARY_TRANSLATIONS]);
      return of([...FALLBACK_PRIMARY_TRANSLATIONS]);
    }

    const url = `${this.config.api.baseUrl}/configuration/primary_translations`;
    const params = new HttpParams().set('api_key', key);

    this.load$ = this.http.get(url, { params, responseType: 'text' }).pipe(
      map((text) => parsePrimaryTranslations(text, url)),
      tap((arr) => {
        this._primary.set(arr.length > 0 ? arr : [...FALLBACK_PRIMARY_TRANSLATIONS]);
      }),
      catchError(() => {
        this._primary.set([...FALLBACK_PRIMARY_TRANSLATIONS]);
        return of([...FALLBACK_PRIMARY_TRANSLATIONS]);
      }),
      shareReplay(1),
    );

    return this.load$;
  }
}

function parseJsonArray(text: string, url: string): string[] {
  const parsed = parseTmdbJsonText<unknown>(text, url);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is string => typeof x === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(x),
  );
}

function parsePrimaryTranslations(text: string, url: string): string[] {
  try {
    return parseJsonArray(text, url);
  } catch {
    // Keep behavior: on parsing failure, fall back to empty list so caller can apply fallback.
    return [];
  }
}
