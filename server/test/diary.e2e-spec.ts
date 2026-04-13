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

  it('stats endpoint returns year summary', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 1,
        title: 'A',
        watchedAt: '2026-02-10',
        location: 'cinema',
        rating: 8,
        tags: ['classic'],
        note: null,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 2,
        title: 'B',
        watchedAt: '2026-03-10',
        location: 'home',
        rating: null,
        tags: ['classic', 'rewatch'],
        note: null,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/diary/stats?year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      year: 2026,
      total: 2,
      ratedCount: 1,
      byLocation: { cinema: 1, home: 1 },
    });
    expect(Array.isArray((res.body as { topTags: unknown[] }).topTags)).toBe(
      true,
    );
  });

  it('export endpoint returns json and csv', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .post('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 1,
        title: 'A, "quoted"',
        watchedAt: '2026-02-10',
        location: 'home',
        rating: 8,
        tags: ['t1', 't2'],
        note: 'line1\nline2',
      })
      .expect(201);

    const json = await request(app.getHttpServer())
      .get('/api/diary/export?format=json&year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((json.body as { filename: string }).filename).toContain('2026');
    expect((json.body as { contentType: string }).contentType).toContain(
      'application/json',
    );

    const csv = await request(app.getHttpServer())
      .get('/api/diary/export?format=csv&year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const csvBody = csv.body as { body: string; contentType: string };
    expect(csvBody.contentType).toContain('text/csv');
    expect(csvBody.body).toContain('id,tmdbId,title');
  });

  afterEach(async () => {
    await app.close();
  });
});
