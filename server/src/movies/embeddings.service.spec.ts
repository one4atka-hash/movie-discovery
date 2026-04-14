import { ConfigService } from '@nestjs/config';

import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  it('uses deterministic provider by default', async () => {
    const config = {
      get: (k: string) => (k === 'EMBEDDINGS_PROVIDER' ? 'deterministic' : ''),
    } as unknown as ConfigService;
    const svc = new EmbeddingsService(config);

    const res = await svc.embedMovieFeature({
      tmdbId: 1,
      title: 'T',
      overview: 'O',
      lang: 'en',
    });
    expect(res.provider).toBe('deterministic');
    expect(Array.isArray(res.vector)).toBe(true);
    expect(res.vector.length).toBeGreaterThan(1000);
  });

  it('calls OpenAI embeddings when configured', async () => {
    const config = {
      get: (k: string) => {
        if (k === 'EMBEDDINGS_PROVIDER') return 'openai';
        if (k === 'OPENAI_API_KEY') return 'k';
        if (k === 'OPENAI_EMBEDDINGS_MODEL') return 'text-embedding-3-small';
        if (k === 'OPENAI_BASE_URL') return 'https://api.openai.com/v1';
        return '';
      },
    } as unknown as ConfigService;
    const svc = new EmbeddingsService(config);

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        expect(url).toContain('/embeddings');
        const rawBody =
          typeof init?.body === 'string'
            ? init.body
            : typeof init?.body === 'object'
              ? JSON.stringify(init.body)
              : '{}';
        const body = JSON.parse(rawBody) as { model: string };
        expect(body.model).toBe('text-embedding-3-small');
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      });

    const res = await svc.embedMovieFeature({
      tmdbId: 2,
      title: 'T',
      overview: 'O',
      lang: 'en',
    });
    expect(res.provider).toBe('openai');
    expect(res.vector).toEqual([0.1, 0.2, 0.3]);

    fetchSpy.mockRestore();
  });
});
