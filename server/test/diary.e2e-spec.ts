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

describe('Diary (e2e)', () => {
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
    await request(app.getHttpServer()).get('/api/diary').expect(401);
    await request(app.getHttpServer()).post('/api/diary').expect(401);
  });

  it('CRUD + date filters', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 550,
        title: 'Fight Club',
        watchedAt: '2026-01-10',
        location: 'home',
        rating: 9,
        tags: ['rewatch', 'classic'],
        note: 'test',
      })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const listAll = await request(app.getHttpServer())
      .get('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((listAll.body as { items: unknown[] }).items.length).toBeGreaterThan(
      0,
    );

    const listFiltered = await request(app.getHttpServer())
      .get('/api/diary?from=2026-01-11&to=2026-01-12')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((listFiltered.body as { items: unknown[] }).items.length).toBe(0);

    await request(app.getHttpServer())
      .put(`/api/diary/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 550,
        title: 'Fight Club',
        watchedAt: '2026-01-10',
        location: 'home',
        rating: 8.5,
        tags: ['classic'],
        note: null,
      })
      .expect(200)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .delete(`/api/diary/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });
  });

  afterEach(async () => {
    await app.close();
  });
});
