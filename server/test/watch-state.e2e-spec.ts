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

  it('validates status', async () => {
    const token = await registerAndGetToken(app);
    await request(app.getHttpServer())
      .put('/api/watch-state/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'nope' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
