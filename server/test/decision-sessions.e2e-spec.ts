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

describe('Decision sessions (e2e)', () => {
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
      .post('/api/decision-sessions')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/decision-sessions/00000000-0000-0000-0000-000000000000')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/decision-sessions/00000000-0000-0000-0000-000000000000/pick')
      .expect(401);
  });

  it('POST → GET → PICK works (MVP)', async () => {
    const token = await registerAndGetToken(app);

    // Seed candidates via favorites.
    await request(app.getHttpServer())
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550 })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/decision-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'top5', constraints: { maxMinutes: 110 } })
      .expect(201);

    const body = created.body as {
      id: string;
      candidates: { tmdbId: number }[];
    };
    expect(typeof body.id).toBe('string');
    expect(Array.isArray(body.candidates)).toBe(true);

    const got = await request(app.getHttpServer())
      .get(`/api/decision-sessions/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const gotBody = got.body as { candidates: { tmdbId: number }[] };
    expect(gotBody.candidates.some((c) => c.tmdbId === 550)).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/decision-sessions/${body.id}/pick`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550 })
      .expect(201)
      .expect({ ok: true });
  });

  afterEach(async () => {
    await app.close();
  });
});
