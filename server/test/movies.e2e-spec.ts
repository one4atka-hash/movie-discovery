import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

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

    process.env.TMDB_API_KEY = prev;
    await appNoKey.close();
  });

  afterEach(async () => {
    await app.close();
  });
});
