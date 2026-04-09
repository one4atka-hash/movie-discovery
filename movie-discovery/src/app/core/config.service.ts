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
    const key = (fromScript && fromScript.length ? fromScript : fromBuild) || '';
    const rawBase = window.__env?.TMDB_BASE_URL?.trim();
    const fromEnvFile = environment.apiBaseUrl?.trim();
    const baseUrl =
      (rawBase && rawBase.length ? rawBase : fromEnvFile) || 'https://api.themoviedb.org/3';
    return {
      baseUrl,
      apiKey: key || undefined
    };
  })();
}

