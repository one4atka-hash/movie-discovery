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

  private buildInput(seed: MovieFeatureSeed): string {
    return [
      seed.title ?? '',
      seed.overview ?? '',
      seed.lang ? `lang:${seed.lang}` : '',
      `tmdbId:${seed.tmdbId}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async retryingFetch(
    input: string,
    init: RequestInit,
    opts: { attempts: number; baseDelayMs: number },
  ): Promise<Response> {
    const attempts = Math.max(1, Math.trunc(opts.attempts));
    const baseDelayMs = Math.max(0, Math.trunc(opts.baseDelayMs));

    let last: Response | null = null;
    for (let i = 0; i < attempts; i += 1) {
      const res = await fetch(input, init);
      last = res;
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return res;
      if (i === attempts - 1) return res;

      const waitMs = baseDelayMs * Math.pow(2, i);
      if (waitMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), waitMs);
        });
      }
    }
    return last ?? (await fetch(input, init));
  }

  async embedMovieFeatures(seeds: readonly MovieFeatureSeed[]): Promise<
    | {
        tmdbId: number;
        ok: true;
        vector: number[];
        provider: 'deterministic' | 'openai';
        model?: string;
      }[]
    | {
        ok: false;
        provider: 'deterministic' | 'openai';
        error: string;
      }
  > {
    const provider = (this.config.get<string>('EMBEDDINGS_PROVIDER') ?? '')
      .toLowerCase()
      .trim();

    if (provider === 'openai') {
      const apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
      if (!apiKey) {
        return {
          ok: false,
          provider: 'openai',
          error: 'OPENAI_API_KEY is required for EMBEDDINGS_PROVIDER=openai',
        };
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

      const input = seeds.map((s) => this.buildInput(s));
      const res = await this.retryingFetch(
        `${normBaseUrl}/embeddings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model, input }),
        },
        { attempts: 3, baseDelayMs: 200 },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return {
          ok: false,
          provider: 'openai',
          error: `OpenAI embeddings failed: ${res.status} ${text}`.trim(),
        };
      }
      const data = (await res.json().catch(() => null)) as {
        data?: { embedding?: unknown; index?: number }[];
      } | null;
      const items = Array.isArray(data?.data) ? (data?.data ?? []) : [];

      const byIndex = new Map<number, unknown>();
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        if (!it) continue;
        const idx = typeof it.index === 'number' ? it.index : i;
        if (idx >= 0) byIndex.set(idx, it.embedding);
      }

      const out: {
        tmdbId: number;
        ok: true;
        vector: number[];
        provider: 'openai';
        model: string;
      }[] = [];
      for (let i = 0; i < seeds.length; i += 1) {
        const emb = byIndex.get(i);
        if (!Array.isArray(emb)) {
          return {
            ok: false,
            provider: 'openai',
            error: `OpenAI embeddings missing item index=${i}`,
          };
        }
        const vec = emb
          .map((x) => (typeof x === 'number' ? x : Number(x)))
          .filter((n) => Number.isFinite(n));
        out.push({
          tmdbId: seeds[i]?.tmdbId ?? 0,
          ok: true,
          vector: vec,
          provider: 'openai',
          model,
        });
      }
      return out;
    }

    return seeds.map((s) => ({
      tmdbId: s.tmdbId,
      ok: true,
      vector: deterministicEmbedding({
        tmdbId: s.tmdbId,
        title: s.title,
        overview: s.overview,
        lang: s.lang,
      }),
      provider: 'deterministic' as const,
    }));
  }

  async embedMovieFeature(seed: MovieFeatureSeed): Promise<{
    vector: number[];
    provider: 'deterministic' | 'openai';
    model?: string;
  }> {
    const batch = await this.embedMovieFeatures([seed]);
    if (!Array.isArray(batch)) {
      throw new Error(batch.error);
    }
    const item = batch[0];
    if (!item) {
      throw new Error('Embeddings provider returned no vector');
    }
    return {
      vector: item.vector,
      provider: item.provider,
      model: item.model,
    };
  }
}
