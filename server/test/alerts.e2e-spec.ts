import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { DbService } from './../src/db/db.service';

async function registerAndGetToken(app: INestApplication<App>) {
  const email = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'passw0rd!';
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password })
    .expect(201);
  return (res.body as { token: string }).token;
}

describe('Alerts (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('requires auth for rules and inbox', async () => {
    await request(app.getHttpServer()).get('/api/alert-rules').expect(401);
    await request(app.getHttpServer()).get('/api/notifications').expect(401);
  });

  it('supports alert rules CRUD (POST+GET+DELETE)', async () => {
    const token = await registerAndGetToken(app);

    const created = await request(app.getHttpServer())
      .post('/api/alert-rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My rule',
        enabled: true,
        filters: { minRating: 7.5, maxRuntime: 150 },
        channels: {
          inApp: true,
          webPush: false,
          email: false,
          calendar: false,
        },
        quietHours: { start: '23:00', end: '09:00', tz: 'UTC' },
      })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);

    const list = await request(app.getHttpServer())
      .get('/api/alert-rules')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as unknown[]) ?? [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((r) => (r as { id?: string }).id === id)).toBe(true);

    // .ics export (MVP): empty calendar is ok; when notifications are tied to rule_id, it includes VEVENT(s).
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const userId = (me.body as { id: string }).id;
    expect(typeof userId).toBe('string');

    // Insert one notification tied to this rule so calendar has a VEVENT.
    const db = app.get(DbService);
    await db.exec(
      `insert into notifications(user_id, rule_id, type, title, body, payload)
       values ($1::uuid, $2::uuid, 'info', 'Rule event', 'From e2e', '{}'::jsonb)`,
      [userId, id],
    );

    const icsRes = await request(app.getHttpServer())
      .get(`/api/alert-rules/${id}/calendar.ics?limit=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(String(icsRes.headers['content-type'] || '')).toContain(
      'text/calendar',
    );
    expect(icsRes.text).toContain('BEGIN:VCALENDAR');
    expect(icsRes.text).toContain('BEGIN:VEVENT');
    expect(icsRes.text).toContain('SUMMARY:Rule event');
    expect(icsRes.text).toContain('END:VCALENDAR');

    await request(app.getHttpServer())
      .delete(`/api/alert-rules/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });
  });

  it('supports inbox read/unread via dev run endpoint', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .post('/api/alerts/run')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true });

    const feed = await request(app.getHttpServer())
      .get('/api/notifications?limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (feed.body as { items: unknown[] }).items;
    expect(items.length).toBeGreaterThan(0);

    const first = items[0] as { id: string; readAt?: string | null };
    expect(first.readAt ?? null).toBeNull();

    await request(app.getHttpServer())
      .post(`/api/notifications/${first.id}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ ok: true });

    const feed2 = await request(app.getHttpServer())
      .get('/api/notifications?limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items2 = (feed2.body as { items: unknown[] }).items;
    const updated = items2.find(
      (x) => (x as { id?: string }).id === first.id,
    ) as { readAt?: string | null } | undefined;
    expect(updated?.readAt).toBeTruthy();
  });

  afterEach(async () => {
    await app.close();
  });
});
