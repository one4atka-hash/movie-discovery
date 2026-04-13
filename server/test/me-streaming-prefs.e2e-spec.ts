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

describe('Me streaming prefs (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/me/streaming-prefs requires auth', async () => {
    await request(app.getHttpServer())
      .get('/api/me/streaming-prefs')
      .expect(401);
  });

  it('PUT/GET /api/me/streaming-prefs stores and returns prefs', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .put('/api/me/streaming-prefs')
      .set('Authorization', `Bearer ${token}`)
      .send({ region: 'ru', providers: ['Netflix', '  Netflix  ', 'Okko'] })
      .expect(200)
      .expect({ ok: true });

    const res = await request(app.getHttpServer())
      .get('/api/me/streaming-prefs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as { region: string; providers: string[] };
    expect(body.region).toBe('RU');
    expect(body.providers).toEqual(['Netflix', 'Okko']);
  });

  it('PUT /api/me/streaming-prefs validates payload', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .put('/api/me/streaming-prefs')
      .set('Authorization', `Bearer ${token}`)
      .send({ region: 'RUS', providers: [] })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
