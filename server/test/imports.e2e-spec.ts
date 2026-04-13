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

describe('Imports (e2e)', () => {
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
    await request(app.getHttpServer()).post('/api/imports').expect(401);
    await request(app.getHttpServer())
      .get('/api/imports/00000000-0000-0000-0000-000000000000')
      .expect(401);
  });

  it('POST then GET returns job status (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'diary', format: 'json', payload: '{"items":[]}' })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const got = await request(app.getHttpServer())
      .get(`/api/imports/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(got.body).toMatchObject({
      id,
      kind: 'diary',
      format: 'json',
      status: 'uploaded',
    });
  });

  it('apply marks job as applied (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'diary', format: 'json', payload: '{"items":[]}' })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true });

    const got = await request(app.getHttpServer())
      .get(`/api/imports/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(got.body).toMatchObject({ id, status: 'applied' });
  });

  it('preview stores rows and sets status preview (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'favorites',
        format: 'json',
        payload: JSON.stringify({ items: [550] }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true, totalRows: 1, okRows: 1, errorRows: 0 });

    const got = await request(app.getHttpServer())
      .get(`/api/imports/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(got.body).toMatchObject({ id, status: 'preview' });
  });

  it('GET /imports/:id/rows returns preview rows (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'favorites',
        format: 'json',
        payload: JSON.stringify({ items: [550, 500] }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/imports/${id}/rows?offset=0&limit=50`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      offset: 0,
      limit: 50,
      total: 2,
    });
    expect(Array.isArray((res.body as { rows: unknown }).rows)).toBe(true);
    const rows = (res.body as { rows: unknown[] }).rows as {
      rowN?: number;
      status?: string;
      mapped?: { tmdbId?: number };
    }[];
    expect(rows.length).toBe(2);
    expect(rows[0]?.rowN).toBe(1);
    expect(rows[0]?.status).toBe('ok');
    expect([rows[0]?.mapped?.tmdbId, rows[1]?.mapped?.tmdbId]).toEqual([
      550, 500,
    ]);
  });

  it('GET /imports/:id/conflicts returns conflicts list (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'favorites',
        format: 'json',
        payload: JSON.stringify({ items: [550] }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/imports/${id}/conflicts?offset=0&limit=50`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      offset: 0,
      limit: 50,
      total: 0,
      conflicts: [],
    });
  });

  it('diary json import applies items into /api/diary (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'diary',
        format: 'json',
        payload: JSON.stringify({
          items: [
            {
              tmdbId: 550,
              title: 'Fight Club',
              watchedAt: '2026-01-10',
              location: 'home',
              rating: 9,
              tags: ['classic'],
              note: null,
            },
          ],
        }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/diary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = (list.body as { items: unknown[] }).items as {
      tmdbId?: number;
      title?: string;
    }[];
    expect(
      items.some((x) => x.tmdbId === 550 && x.title === 'Fight Club'),
    ).toBe(true);
  });

  it('watch_state json import applies items into /api/watch-state (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'watch_state',
        format: 'json',
        payload: JSON.stringify({
          items: [
            {
              tmdbId: 550,
              status: 'watching',
              progress: { minutes: 12, pct: 10 },
            },
          ],
        }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true, totalRows: 1, okRows: 1, errorRows: 0 });

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/watch-state')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = (list.body as { items: unknown[] }).items as {
      tmdbId?: number;
      status?: string;
    }[];
    expect(items.some((x) => x.tmdbId === 550 && x.status === 'watching')).toBe(
      true,
    );
  });

  it('favorites json import applies items into /api/favorites (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'favorites',
        format: 'json',
        payload: JSON.stringify({ items: [550, 500] }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = list.body as unknown[] as { tmdbId?: number }[];
    expect(items.some((x) => x.tmdbId === 550)).toBe(true);
    expect(items.some((x) => x.tmdbId === 500)).toBe(true);
  });

  it('resolve row updates mapped and affects apply (MVP)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'favorites',
        format: 'json',
        payload: JSON.stringify({ items: [550, 500] }),
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/preview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/rows/2/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ok', mapped: { tmdbId: 123 } })
      .expect(201)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = list.body as unknown[] as { tmdbId?: number }[];
    expect(items.some((x) => x.tmdbId === 550)).toBe(true);
    expect(items.some((x) => x.tmdbId === 500)).toBe(false);
    expect(items.some((x) => x.tmdbId === 123)).toBe(true);
  });

  it('diary csv import applies items into /api/diary (Letterboxd MVP)', async () => {
    const token = await registerAndGetToken(app);

    const csv = [
      'Date,Name,Year,Rating,Tags',
      '2026-01-10,Fight Club,1999,4.5,"classic, rewatch"',
    ].join('\n');

    const created = await request(app.getHttpServer())
      .post('/api/imports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kind: 'diary',
        format: 'csv',
        payload: csv,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/imports/${id}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/diary?from=2026-01-10&to=2026-01-10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = (list.body as { items: unknown[] }).items as {
      title?: string;
      watchedAt?: string;
      rating?: unknown;
    }[];
    expect(
      items.some(
        (x) =>
          x.title === 'Fight Club' &&
          x.watchedAt === '2026-01-10' &&
          (x.rating === 9 || Number(x.rating) === 9),
      ),
    ).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
