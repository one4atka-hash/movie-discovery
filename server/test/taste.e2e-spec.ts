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

describe('Taste & auto-collections (e2e)', () => {
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
    await request(app.getHttpServer()).get('/api/auto-collections').expect(401);
    await request(app.getHttpServer()).get('/api/taste/summary').expect(401);
    await request(app.getHttpServer())
      .get('/api/taste/similar-to?tmdbId=1')
      .expect(401);
  });

  it('auto-collections, taste summary, similar-to (favorites fallback)', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 551 })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/watch-state/600')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 700,
        title: 'Diary test title',
        watchedAt: '2025-06-01',
        location: 'home',
      })
      .expect(201);

    const ac = await request(app.getHttpServer())
      .get('/api/auto-collections')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const cols = (
      ac.body as { collections: { id: string; itemCount: number }[] }
    ).collections;
    const fav = cols.find((c) => c.id === 'auto:favorites');
    expect(fav?.itemCount).toBeGreaterThanOrEqual(2);

    const want = cols.find((c) => c.id === 'auto:watch:want');
    expect(want?.itemCount).toBeGreaterThanOrEqual(1);

    const sum = await request(app.getHttpServer())
      .get('/api/taste/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const summary = sum.body as {
      counts: { favorites: number; diaryEntries: number };
      topGenres: unknown[];
    };
    expect(summary.counts.favorites).toBeGreaterThanOrEqual(2);
    expect(summary.counts.diaryEntries).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(summary.topGenres)).toBe(true);

    const sim = await request(app.getHttpServer())
      .get('/api/taste/similar-to?tmdbId=550')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const simBody = sim.body as {
      source: string;
      items: { tmdbId: number }[];
    };
    expect(['embedding', 'favorites_fallback']).toContain(simBody.source);
    if (simBody.source === 'favorites_fallback') {
      expect(simBody.items.some((x) => x.tmdbId === 551)).toBe(true);
    }
  });

  afterEach(async () => {
    await app.close();
  });
});
