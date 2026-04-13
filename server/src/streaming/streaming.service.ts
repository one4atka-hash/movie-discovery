import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  TmdbWatchProvidersCatalogSchema,
  type TmdbWatchProvidersCatalog,
} from './streaming.schemas';

@Injectable()
export class StreamingService {
  constructor(private readonly config: ConfigService) {}

  async listProviders(region: string): Promise<
    {
      id: number;
      name: string;
      logoPath: string | null;
      displayPriority: number | null;
    }[]
  > {
    const apiKey = (this.config.get<string>('TMDB_API_KEY') ?? '').trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('TMDB is not configured');
    }

    const baseUrl = (
      this.config.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3'
    )
      .trim()
      .replace(/\/+$/, '');
    const cc = (region || 'US').trim().toUpperCase();

    const url = new URL(`${baseUrl}/watch/providers/movie`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('watch_region', cc);

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException('TMDB request failed');
    }
    const json = (await res.json()) as unknown;
    const parsed: TmdbWatchProvidersCatalog =
      TmdbWatchProvidersCatalogSchema.parse(json);

    return parsed.results
      .map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path ?? null,
        displayPriority: Number.isFinite(p.display_priority)
          ? p.display_priority!
          : null,
      }))
      .sort(
        (a, b) =>
          (a.displayPriority ?? 999) - (b.displayPriority ?? 999) ||
          a.name.localeCompare(b.name),
      );
  }
}
