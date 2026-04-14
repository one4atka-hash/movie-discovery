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

describe('Recommendations (e2e)', () => {
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
    await request(app.getHttpServer()).get('/api/recommendations').expect(401);
    await request(app.getHttpServer())
      .get('/api/recommendations/metrics')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/recommendations/feedback')
      .expect(401);
  });

  it('returns explain payload and accepts feedback', async () => {
    const token = await registerAndGetToken(app);

    const recs = await request(app.getHttpServer())
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = recs.body as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);

    const m = await request(app.getHttpServer())
      .get('/api/recommendations/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const metrics = m.body as {
      diversity: number;
      novelty: number;
      coverage: number;
      counts: {
        rawSeeds: number;
        uniqueCandidates: number;
        blocked: number;
        favorites: number;
        feedbackRows: number;
      };
      meta: { mode: string };
    };
    expect(metrics.diversity).toBeGreaterThanOrEqual(0);
    expect(metrics.diversity).toBeLessThanOrEqual(1);
    expect(metrics.novelty).toBeGreaterThanOrEqual(0);
    expect(metrics.novelty).toBeLessThanOrEqual(1);
    expect(metrics.coverage).toBeGreaterThanOrEqual(0);
    expect(metrics.coverage).toBeLessThanOrEqual(1);
    expect(metrics.counts.feedbackRows).toBeGreaterThanOrEqual(0);
    expect(metrics.meta.mode).toBe('mvp');

    await request(app.getHttpServer())
      .post('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, action: 'hide' })
      .expect(201)
      .expect({ ok: true });
  });

  it('hide feedback removes item from next recommendations call (MVP)', async () => {
    const token = await registerAndGetToken(app);

    // Seed recommendations via favorites.
    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550 })
      .expect(201)
      .expect({ ok: true });

    const recs1 = await request(app.getHttpServer())
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids1 = (recs1.body as { items: unknown[] }).items.map(
      (x) => (x as { tmdbId?: number }).tmdbId,
    );
    expect(ids1).toContain(550);

    await request(app.getHttpServer())
      .post('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, action: 'hide' })
      .expect(201);

    const recs2 = await request(app.getHttpServer())
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids2 = (recs2.body as { items: unknown[] }).items.map(
      (x) => (x as { tmdbId?: number }).tmdbId,
    );
    expect(ids2).not.toContain(550);
  });

  it('uses ANN mode when seed embeddings exist', async () => {
    const token = await registerAndGetToken(app);

    // Seed via favorites.
    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 100 })
      .expect(201);

    // Provide embeddings for seed + candidates (cheap deterministic vectors).
    // NOTE: these embeddings are arbitrary but valid pgvector literals.
    const seedVec = `[${new Array(1536)
      .fill(0)
      .map((_, i) => (i === 0 ? '1' : '0'))
      .join(',')}]`;
    const cand1 = `[${new Array(1536)
      .fill(0)
      .map((_, i) => (i === 0 ? '0.9' : '0'))
      .join(',')}]`;
    const cand2 = `[${new Array(1536)
      .fill(0)
      .map((_, i) => (i === 1 ? '1' : '0'))
      .join(',')}]`;

    const db = app.get(DbService);
    await db.exec(
      `insert into movie_features(tmdb_id, title, overview, lang, embedding)
       values
         (100, 'Seed', '', 'en', $1::vector),
         (200, 'Cand1', '', 'en', $2::vector),
         (300, 'Cand2', '', 'en', $3::vector)
       on conflict (tmdb_id) do update set embedding = excluded.embedding`,
      [seedVec, cand1, cand2],
    );

    const recs = await request(app.getHttpServer())
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = recs.body as {
      meta: { mode: string };
      items: { tmdbId: number }[];
    };
    expect(body.meta.mode).toBe('ann');
    expect(body.items.length).toBeGreaterThan(0);
  });

  afterEach(async () => {
    await app.close();
  });
});
