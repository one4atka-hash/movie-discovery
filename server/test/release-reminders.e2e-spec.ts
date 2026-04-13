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

  afterEach(async () => {
    await app.close();
  });
});
