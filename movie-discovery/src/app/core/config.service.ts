import { Injectable } from '@angular/core';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  // В дальнейшем можно читать из environments
  readonly api: ApiConfig = {
    baseUrl: 'https://api.themoviedb.org/3'
  };
}

