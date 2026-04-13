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

describe('Release reminders (e2e)', () => {
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
      .get('/api/release-reminders')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/release-reminders')
      .send({
        tmdbId: 1,
        mediaType: 'movie',
        reminderType: 'any',
        window: { daysBefore: 0 },
        channels: { inApp: true },
      })
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/release-reminders/123e4567-e89b-12d3-a456-426614174000')
      .expect(401);
  });

  it('POST → GET → DELETE', async () => {
    const token = await registerAndGetToken(app);
    const tmdbId = 7_000_000 + Math.floor(Math.random() * 99_000);

    const created = await request(app.getHttpServer())
      .post('/api/release-reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId,
        mediaType: 'movie',
        reminderType: 'digital',
        window: { daysBefore: 3 },
        channels: { inApp: true, email: false },
      })
      .expect(201);

    const c = created.body as {
      ok: boolean;
      reminder: { id: string; tmdbId: number };
    };
    expect(c.ok).toBe(true);
    expect(c.reminder.tmdbId).toBe(tmdbId);
    const id = c.reminder.id;

    const list = await request(app.getHttpServer())
      .get('/api/release-reminders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: { id: string }[] }).items;
    expect(items.some((x) => x.id === id)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/release-reminders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });

    const after = await request(app.getHttpServer())
      .get('/api/release-reminders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items2 = (after.body as { items: { id: string }[] }).items;
    expect(items2.some((x) => x.id === id)).toBe(false);
  });

  it('validates body', async () => {
    const token = await registerAndGetToken(app);
    await request(app.getHttpServer())
      .post('/api/release-reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId: 1,
        mediaType: 'movie',
        reminderType: 'any',
        window: { daysBefore: -1 },
        channels: { inApp: true },
      })
      .expect(400);
  });

  it('dev tick enqueues release notification on trigger day', async () => {
    const token = await registerAndGetToken(app);
    const tmdbId = 7_100_000 + Math.floor(Math.random() * 99_000);

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: tmdbId,
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [{ type: 3, release_date: '2026-04-20' }],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await request(app.getHttpServer())
      .get(`/api/movies/${tmdbId}/releases`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/release-reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tmdbId,
        mediaType: 'movie',
        reminderType: 'theatrical',
        window: { daysBefore: 7 },
        channels: { inApp: true },
      })
      .expect(201);

    const tick1 = await request(app.getHttpServer())
      .post('/api/release-reminders/dev/tick')
      .set('Authorization', `Bearer ${token}`)
      .send({ todayYmd: '2026-04-13' })
      .expect(200);

    expect((tick1.body as { ok: boolean; enqueued: number }).ok).toBe(true);
    expect(
      (tick1.body as { enqueued: number }).enqueued,
    ).toBeGreaterThanOrEqual(1);

    const tick2 = await request(app.getHttpServer())
      .post('/api/release-reminders/dev/tick')
      .set('Authorization', `Bearer ${token}`)
      .send({ todayYmd: '2026-04-13' })
      .expect(200);
    expect((tick2.body as { enqueued: number }).enqueued).toBe(0);

    const feed = await request(app.getHttpServer())
      .get('/api/notifications?limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (feed.body as { items: { type: string }[] }).items;
    expect(items.some((x) => x.type === 'release')).toBe(true);

    fetchSpy.mockRestore();
  });

  afterEach(async () => {
    await app.close();
  });
});
