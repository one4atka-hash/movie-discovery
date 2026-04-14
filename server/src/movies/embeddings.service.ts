import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { deterministicEmbedding } from './embeddings.util';

type MovieFeatureSeed = {
  tmdbId: number;
  title: string | null;
  overview: string | null;
  lang: string | null;
};

@Injectable()
export class EmbeddingsService {
  constructor(private readonly config: ConfigService) {}

  async embedMovieFeature(seed: MovieFeatureSeed): Promise<{
    vector: number[];
    provider: 'deterministic' | 'openai';
    model?: string;
  }> {
    const provider = (this.config.get<string>('EMBEDDINGS_PROVIDER') ?? '')
      .toLowerCase()
      .trim();

    if (provider === 'openai') {
      const apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
      if (!apiKey) {
        throw new Error(
          'OPENAI_API_KEY is required for EMBEDDINGS_PROVIDER=openai',
        );
      }
      const model =
        this.config.get<string>('OPENAI_EMBEDDINGS_MODEL') ??
        'text-embedding-3-small';
      const baseUrl =
        this.config.get<string>('OPENAI_BASE_URL') ??
        'https://api.openai.com/v1';
      const normBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;

      const input = [
        seed.title ?? '',
        seed.overview ?? '',
        seed.lang ? `lang:${seed.lang}` : '',
        `tmdbId:${seed.tmdbId}`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await fetch(`${normBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model, input }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `OpenAI embeddings failed: ${res.status} ${text}`.trim(),
        );
      }
      const data = (await res.json().catch(() => null)) as {
        data?: { embedding?: unknown }[];
      } | null;
      const vec = data?.data?.[0]?.embedding;
      if (!Array.isArray(vec)) {
        throw new Error('OpenAI embeddings response is invalid');
      }
      const out = vec
        .map((x) => (typeof x === 'number' ? x : Number(x)))
        .filter((n) => Number.isFinite(n));
      return { vector: out, provider: 'openai', model };
    }

    const vector = deterministicEmbedding({
      tmdbId: seed.tmdbId,
      title: seed.title,
      overview: seed.overview,
      lang: seed.lang,
    });
    return { vector, provider: 'deterministic' };
  }
}
