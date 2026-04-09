import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  /**
   * Ключ: сначала непустой `public/env.js` (window.__env), иначе environment.
   * Пустая строка в env.js не должна «перебивать» ключ из environment — раньше так и ломалось.
   */
  readonly api: ApiConfig = (() => {
    const fromScript = window.__env?.TMDB_API_KEY?.trim();
    const fromBuild = environment.apiKey?.trim();
    const rawKey = (fromScript && fromScript.length ? fromScript : fromBuild) || '';
    const key = isValidTmdbV3ApiKey(rawKey) ? rawKey : '';
    if (rawKey && !key) {
      console.warn('[Config] Invalid TMDB v3 API key format. Expected 32-hex string.', { rawKeyLength: rawKey.length });
    }
    const rawBase = window.__env?.TMDB_BASE_URL?.trim();
    const fromEnvFile = environment.apiBaseUrl?.trim();
    const candidate = (
      (rawBase && rawBase.length ? rawBase : fromEnvFile) || 'https://api.themoviedb.org/3'
    )
      .trim()
      .replace(/\/+$/, '');

    /**
     * В dev мы ожидаем тот же origin (`/tmdb`) и прокси (proxy.conf.json).
     * Прямые вызовы `https://api.themoviedb.org/3` из браузера часто ломаются из‑за CORS.
     */
    const baseUrl = (() => {
      if (!environment.production) {
        if (/^https?:\/\//i.test(candidate)) {
          console.warn(
            '[Config] Direct TMDB baseUrl in dev detected. Falling back to /tmdb to avoid CORS.',
            { candidate }
          );
          return '/tmdb';
        }
      }
      return candidate;
    })();
    return {
      baseUrl,
      apiKey: key || undefined
    };
  })();
}

function isValidTmdbV3ApiKey(v: string): boolean {
  return /^[a-f0-9]{32}$/i.test(v);
}

