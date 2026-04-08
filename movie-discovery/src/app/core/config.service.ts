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
  readonly api: ApiConfig = {
    baseUrl: (window.__env?.TMDB_BASE_URL ?? environment.apiBaseUrl) || 'https://api.themoviedb.org/3',
    apiKey: (window.__env?.TMDB_API_KEY ?? environment.apiKey ?? '').trim() || undefined
  };
}

