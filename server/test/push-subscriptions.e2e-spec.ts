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

describe('Push subscriptions (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET vapid-public without auth returns shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/push/vapid-public')
      .expect(200);
    const body = res.body as { publicKey: string | null };
    expect(body).toHaveProperty('publicKey');
    expect(body.publicKey === null || typeof body.publicKey === 'string').toBe(
      true,
    );
  });

  it('requires auth', async () => {
    await request(app.getHttpServer())
      .get('/api/push/subscriptions')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .send({
        endpoint: 'https://example.com/push/abc',
        keys: { p256dh: 'x', auth: 'y' },
      })
      .expect(401);
  });

  it('subscribe → list → delete', async () => {
    const token = await registerAndGetToken(app);
    const body = {
      endpoint: 'https://push.example.test/e2e-endpoint',
      keys: {
        p256dh:
          'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8Q',
        auth: 'tBHItJI5svbpez7KI4CCX',
      },
    };

    const sub = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    const id = (sub.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const list = await request(app.getHttpServer())
      .get('/api/push/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: { id: string; endpoint: string }[] })
      .items;
    expect(items.some((x) => x.id === id)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/push/subscriptions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });

    const list2 = await request(app.getHttpServer())
      .get('/api/push/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items2 = (list2.body as { items: unknown[] }).items;
    expect(items2.length).toBe(0);
  });

  it('upserts same endpoint', async () => {
    const token = await registerAndGetToken(app);
    const body = {
      endpoint: 'https://push.example.test/same',
      keys: { p256dh: 'key1', auth: 'a1' },
    };

    const a = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    const id1 = (a.body as { id: string }).id;

    const b = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...body, keys: { p256dh: 'key2', auth: 'a2' } })
      .expect(201);
    const id2 = (b.body as { id: string }).id;

    expect(id1).toBe(id2);

    const list = await request(app.getHttpServer())
      .get('/api/push/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((list.body as { items: unknown[] }).items.length).toBe(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
