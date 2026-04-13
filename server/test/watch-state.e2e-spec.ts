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

describe('Watch state (e2e)', () => {
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
    await request(app.getHttpServer()).get('/api/watch-state').expect(401);
    await request(app.getHttpServer())
      .post('/api/watch-state/bulk')
      .send({ items: [{ tmdbId: 1, status: 'want' }] })
      .expect(401);
    await request(app.getHttpServer()).put('/api/watch-state/1').expect(401);
    await request(app.getHttpServer()).delete('/api/watch-state/1').expect(401);
  });

  it('PUT → GET → DELETE works', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .put('/api/watch-state/550')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want', progress: { minutes: 10 } })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/watch-state')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((x) => (x as { tmdbId?: number }).tmdbId === 550)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete('/api/watch-state/550')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });
  });

  it('POST bulk applies multiple rows', async () => {
    const token = await registerAndGetToken(app);

    const bulk = await request(app.getHttpServer())
      .post('/api/watch-state/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { tmdbId: 100, status: 'want' },
          { tmdbId: 200, status: 'hidden' },
        ],
      })
      .expect(201);

    const b = bulk.body as {
      ok: boolean;
      items: { tmdbId: number; updatedAt: string }[];
    };
    expect(b.ok).toBe(true);
    expect(b.items).toHaveLength(2);
    expect(b.items.map((x) => x.tmdbId).sort((a, c) => a - c)).toEqual([
      100, 200,
    ]);

    const list = await request(app.getHttpServer())
      .get('/api/watch-state')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: { tmdbId: number; status: string }[] })
      .items;
    const byId = new Map(items.map((x) => [x.tmdbId, x.status]));
    expect(byId.get(100)).toBe('want');
    expect(byId.get(200)).toBe('hidden');
  });

  it('validates status', async () => {
    const token = await registerAndGetToken(app);
    await request(app.getHttpServer())
      .put('/api/watch-state/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'nope' })
      .expect(400);
  });

  it('validates progress payload', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .put('/api/watch-state/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want', progress: { minutes: -1 } })
      .expect(400);

    await request(app.getHttpServer())
      .put('/api/watch-state/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want', progress: { pct: 101 } })
      .expect(400);

    await request(app.getHttpServer())
      .put('/api/watch-state/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'want', progress: {} })
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
