import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { DbService } from './../src/db/db.service';

async function registerAndGetToken(app: INestApplication<App>) {
  const email = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'passw0rd!';
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password })
    .expect(201);
  return (res.body as { token: string }).token;
}

describe('Movies releases (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('requires auth', async () => {
    await request(app.getHttpServer())
      .get('/api/movies/550/releases')
      .expect(401);
  });

  it('returns release dates (TMDB mocked) and caches snapshot', async () => {
    const token = await registerAndGetToken(app);
    const tmdbId = 8_000_000 + Math.floor(Math.random() * 99_000);

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: tmdbId,
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [{ type: 3, release_date: '2024-01-01' }],
              },
              {
                iso_3166_1: 'FR',
                release_dates: [{ type: 3, release_date: '2024-02-01' }],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const r1 = await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/releases`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const b1 = r1.body as {
      tmdbId: number;
      cached: boolean;
      results: { iso31661: string }[];
    };
    expect(b1.tmdbId).toBe(tmdbId);
    expect(b1.cached).toBe(false);
    expect(b1.results).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const r2 = await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/releases`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const b2 = r2.body as { cached: boolean; results: unknown[] };
    expect(b2.cached).toBe(true);
    expect(b2.results).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const rUs = await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/releases?region=us`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const bUs = rUs.body as { region: string | null; results: unknown[] };
    expect(bUs.region).toBe('US');
    expect(bUs.results).toHaveLength(1);

    fetchSpy.mockRestore();
  });

  it('validates region', async () => {
    const token = await registerAndGetToken(app);
    await request(app.getHttpServer())
      .get('/api/movies/550/releases?region=USA')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('supports features refresh batch (TMDB mocked)', async () => {
    const prev = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test_key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const appKey = moduleFixture.createNestApplication();
    appKey.setGlobalPrefix('api');
    await appKey.init();

    const token = await registerAndGetToken(appKey as INestApplication<App>);
    const tmdbIds = [
      7_700_000 + Math.floor(Math.random() * 10_000),
      7_800_000 + Math.floor(Math.random() * 10_000),
    ];

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL) => {
        const u =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const m = u.match(/\/movie\/(\d+)(\/credits|\/keywords)?/);
        const id = Number(m?.[1] ?? 0);
        const suffix = m?.[2] ?? '';
        const body =
          suffix === '/credits'
            ? { id, cast: [], crew: [] }
            : suffix === '/keywords'
              ? { id, keywords: [] }
              : {
                  id,
                  title: `T${id}`,
                  overview: 'O',
                  original_language: 'en',
                  genres: [],
                };
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      });

    const res = await request(appKey.getHttpServer() as App)
      .post('/api/movies/features/refresh-batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbIds, language: 'en' })
      .expect(201);

    const b = res.body as {
      ok: true;
      items: { tmdbId: number; ok: true; updatedAt: string }[];
      errors: { tmdbId: number; error: string }[];
    };
    expect(b.ok).toBe(true);
    expect(b.errors).toHaveLength(0);
    expect(b.items.map((x) => x.tmdbId).sort()).toEqual([...tmdbIds].sort());
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
    process.env.TMDB_API_KEY = prev;
    await appKey.close();
  });

  it('returns editions from release snapshot (heuristic)', async () => {
    const token = await registerAndGetToken(app);
    const tmdbId = 8_100_000 + Math.floor(Math.random() * 99_000);

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: tmdbId,
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [
                  { type: 3, release_date: '2024-01-01' },
                  { type: 4, release_date: '2024-06-01' },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/releases`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ed = await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/editions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = ed.body as {
      tmdbId: number;
      items: { editionKey: string; source: string }[];
    };
    expect(body.tmdbId).toBe(tmdbId);
    const keys = body.items.map((i) => i.editionKey);
    expect(keys).toContain('theatrical');
    expect(keys).toContain('digital');

    fetchSpy.mockRestore();
  });

  it('returns 503 when TMDB key is not configured', async () => {
    const prev = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const appNoKey = moduleFixture.createNestApplication();
    appNoKey.setGlobalPrefix('api');
    await appNoKey.init();

    const token = await registerAndGetToken(appNoKey as INestApplication<App>);
    await request(appNoKey.getHttpServer() as App)
      .get('/api/movies/999999/releases')
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    await request(appNoKey.getHttpServer() as App)
      .get('/api/movies/999999/features/refresh')
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    const batch = await request(appNoKey.getHttpServer() as App)
      .post('/api/movies/features/refresh-batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbIds: [999999] })
      .expect(201);

    const bb = batch.body as {
      ok: true;
      items: unknown[];
      errors: { tmdbId: number; error: string }[];
    };
    expect(bb.ok).toBe(true);
    expect(bb.items).toHaveLength(0);
    expect(bb.errors).toHaveLength(1);

    process.env.TMDB_API_KEY = prev;
    await appNoKey.close();
  });

  it('supports creating and reading embeddings job', async () => {
    const token = await registerAndGetToken(app);
    const create = await request(app.getHttpServer())
      .post('/api/movies/features/embeddings/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbIds: [550, 551] })
      .expect(201);

    const id = (create.body as { ok: true; id: string }).id;
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);

    const get = await request(app.getHttpServer())
      .get(`/api/movies/features/embeddings/jobs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = get.body as {
      ok: true;
      job: {
        id: string;
        kind: string;
        status: string;
        tmdbIds: number[];
      } | null;
    };
    expect(body.ok).toBe(true);
    expect(body.job?.id).toBe(id);
    expect(body.job?.kind).toBe('embeddings');
    expect(body.job?.status).toBe('queued');
    expect(body.job?.tmdbIds).toEqual([550, 551]);
  });

  it('can run embeddings job (scaffold) and marks it failed when disabled', async () => {
    const token = await registerAndGetToken(app);
    const create = await request(app.getHttpServer())
      .post('/api/movies/features/embeddings/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbIds: [550] })
      .expect(201);

    const id = (create.body as { ok: true; id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/movies/features/embeddings/jobs/${id}/run`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const get = await request(app.getHttpServer())
      .get(`/api/movies/features/embeddings/jobs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = get.body as {
      ok: true;
      job: { status: string; error: string | null } | null;
    };
    expect(body.job?.status).toBe('failed');
    expect(body.job?.error).toContain('disabled');
  });

  it('can run embeddings job and writes vectors when enabled', async () => {
    const prev = process.env.EMBEDDINGS_ENABLED;
    process.env.EMBEDDINGS_ENABLED = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const appEmb = moduleFixture.createNestApplication();
    appEmb.setGlobalPrefix('api');
    await appEmb.init();

    const token = await registerAndGetToken(appEmb as INestApplication<App>);

    // Prepare movie_features rows for tmdbIds.
    const db = appEmb.get(DbService);
    await db.exec(
      `insert into movie_features(tmdb_id, title, overview, lang)
       values (550, 'Fight Club', 'Test', 'en')
       on conflict (tmdb_id) do update set title = excluded.title`,
    );

    const create = await request(appEmb.getHttpServer() as App)
      .post('/api/movies/features/embeddings/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbIds: [550] })
      .expect(201);

    const id = (create.body as { ok: true; id: string }).id;

    await request(appEmb.getHttpServer() as App)
      .post(`/api/movies/features/embeddings/jobs/${id}/run`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const get = await request(appEmb.getHttpServer() as App)
      .get(`/api/movies/features/embeddings/jobs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = get.body as {
      ok: true;
      job: { status: string; error: string | null } | null;
    };
    expect(body.job?.status).toBe('completed');

    const rows = await db.query<{ embedding: string | null }>(
      `select embedding from movie_features where tmdb_id = 550`,
    );
    expect(rows[0]?.embedding).toBeTruthy();

    process.env.EMBEDDINGS_ENABLED = prev;
    await appEmb.close();
  });

  afterEach(async () => {
    await app.close();
  });
});
