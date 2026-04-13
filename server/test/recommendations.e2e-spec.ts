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

  afterEach(async () => {
    await app.close();
  });
});
