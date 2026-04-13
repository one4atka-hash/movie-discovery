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

describe('Availability (e2e)', () => {
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
      .get('/api/availability/events?since=2020-01-01T00:00:00.000Z')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/availability/track')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/availability/ingest')
      .expect(401);
  });

  it('track + ingest emits events', async () => {
    const token = await registerAndGetToken(app);

    await request(app.getHttpServer())
      .post('/api/availability/track')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, region: 'US' })
      .expect(201);

    const i1 = await request(app.getHttpServer())
      .post('/api/availability/ingest')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, region: 'US', providers: ['netflix'] })
      .expect(201);

    const b1 = i1.body as { diffEmitted: boolean; eventsCreated: number };
    expect(b1.diffEmitted).toBe(true);
    expect(b1.eventsCreated).toBe(1);

    const i2 = await request(app.getHttpServer())
      .post('/api/availability/ingest')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 550, region: 'US', providers: ['netflix', 'hulu'] })
      .expect(201);

    const b2 = i2.body as { diffEmitted: boolean; eventsCreated: number };
    expect(b2.diffEmitted).toBe(true);
    expect(b2.eventsCreated).toBe(1);

    const list = await request(app.getHttpServer())
      .get('/api/availability/events?since=2020-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const items = (list.body as { items: { tmdbId: number; type: string }[] })
      .items;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((x) => x.type === 'added')).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
